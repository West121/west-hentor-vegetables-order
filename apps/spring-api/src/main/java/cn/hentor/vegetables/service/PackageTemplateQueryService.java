package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.PackageTemplateBenefitRequest;
import cn.hentor.vegetables.dto.PackageTemplateListItem;
import cn.hentor.vegetables.dto.PackageTemplateRequest;
import cn.hentor.vegetables.dto.PackageTemplateResponse;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.PackageTemplateBenefitEntity;
import cn.hentor.vegetables.entity.PackageTemplateEntity;
import cn.hentor.vegetables.entity.UserPackageEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.PackageTemplateBenefitMapper;
import cn.hentor.vegetables.mapper.PackageTemplateMapper;
import cn.hentor.vegetables.mapper.UserPackageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PackageTemplateQueryService {
  private static final int INTERNAL_VALID_DAYS = 36500;
  private static final Set<String> TEMPLATE_STATUSES = Set.of("ACTIVE", "DISABLED");

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final PackageTemplateBenefitMapper benefitMapper;
  private final ObjectMapper objectMapper;
  private final PackageTemplateMapper packageTemplateMapper;
  private final UserPackageMapper userPackageMapper;

  public PackageTemplateQueryService(
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    PackageTemplateBenefitMapper benefitMapper,
    ObjectMapper objectMapper,
    PackageTemplateMapper packageTemplateMapper,
    UserPackageMapper userPackageMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.benefitMapper = benefitMapper;
    this.objectMapper = objectMapper;
    this.packageTemplateMapper = packageTemplateMapper;
    this.userPackageMapper = userPackageMapper;
  }

  public PageResult<PackageTemplateListItem> listTemplates(
    String storeId,
    String status,
    String query,
    long page,
    long pageSize
  ) {
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    LambdaQueryWrapper<PackageTemplateEntity> wrapper =
      new LambdaQueryWrapper<PackageTemplateEntity>()
        .eq(PackageTemplateEntity::getStoreId, storeId)
        .orderByAsc(PackageTemplateEntity::getStatus)
        .orderByAsc(PackageTemplateEntity::getSortOrder)
        .orderByDesc(PackageTemplateEntity::getCreatedAt);

    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      validateStatus(status);
      wrapper.apply("\"status\" = {0}", status);
    }

    if (StringUtils.hasText(query)) {
      wrapper.like(PackageTemplateEntity::getName, query.trim());
    }

    Page<PackageTemplateEntity> result = packageTemplateMapper.selectPage(
      new Page<>(normalizedPage, normalizedPageSize),
      wrapper
    );
    Map<String, List<PackageTemplateBenefitEntity>> benefitsByTemplate =
      loadBenefitsByTemplate(result.getRecords());
    List<PackageTemplateListItem> items = result
      .getRecords()
      .stream()
      .map(template -> toDto(template, benefitsByTemplate.getOrDefault(template.getId(), List.of())))
      .toList();
    long totalPages =
      result.getSize() == 0 ? 0 : (long) Math.ceil((double) result.getTotal() / result.getSize());

    return new PageResult<>(
      items,
      result.getCurrent(),
      result.getSize(),
      result.getTotal(),
      totalPages
    );
  }

  public PackageTemplateResponse getTemplate(String storeId, String templateId) {
    PackageTemplateEntity template = requireTemplate(storeId, templateId);
    return new PackageTemplateResponse(toDto(template, loadBenefits(template.getId())));
  }

  @Transactional
  public PackageTemplateResponse createTemplate(
    PackageTemplateRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    NormalizedTemplateInput input = normalizeTemplateInput(request, "ACTIVE");
    List<NormalizedBenefitInput> benefits = normalizeBenefits(request.benefits());
    LocalDateTime now = LocalDateTime.now();

    PackageTemplateEntity template = new PackageTemplateEntity();
    template.setId(id());
    template.setStoreId(request.storeId());
    template.setName(input.name());
    template.setTotalTimes(input.totalTimes());
    template.setWeightLimitJin(input.weightLimitJin());
    template.setValidDays(INTERNAL_VALID_DAYS);
    template.setStatus("ACTIVE");
    template.setSortOrder(input.sortOrder());
    template.setCreatedAt(now);
    template.setUpdatedAt(now);
    packageTemplateMapper.insertAdminPackageTemplate(template);
    replaceBenefits(template.getId(), benefits, now);

    PackageTemplateEntity created = requireTemplate(request.storeId(), template.getId());
    List<PackageTemplateBenefitEntity> createdBenefits = loadBenefits(template.getId());
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      template.getId(),
      "PACKAGE_TEMPLATE_CREATED",
      null,
      templateLogValue(created, createdBenefits)
    );
    return new PackageTemplateResponse(toDto(created, createdBenefits));
  }

  @Transactional
  public PackageTemplateResponse updateTemplate(
    String templateId,
    PackageTemplateRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    String status = StringUtils.hasText(request.status()) ? request.status().trim() : "ACTIVE";
    validateStatus(status);
    NormalizedTemplateInput input = normalizeTemplateInput(request, status);
    List<NormalizedBenefitInput> benefits = normalizeBenefits(request.benefits());
    PackageTemplateEntity existing = requireTemplate(request.storeId(), templateId);
    List<PackageTemplateBenefitEntity> beforeBenefits = loadBenefits(existing.getId());

    boolean changesBoundPackageCore =
      !existing.getTotalTimes().equals(input.totalTimes()) ||
      existing.getWeightLimitJin().compareTo(input.weightLimitJin()) != 0;
    if (changesBoundPackageCore) {
      Long packageCount = userPackageMapper.selectCount(
        new LambdaQueryWrapper<UserPackageEntity>()
          .eq(UserPackageEntity::getTemplateId, existing.getId())
      );
      if (packageCount != null && packageCount > 0) {
        throw new ApiException(
          "PACKAGE_TEMPLATE_IN_USE",
          "已有用户套餐使用该模板，不能修改总次数或单次重量",
          HttpStatus.CONFLICT
        );
      }
    }

    PackageTemplateEntity update = new PackageTemplateEntity();
    update.setId(existing.getId());
    update.setName(input.name());
    update.setTotalTimes(input.totalTimes());
    update.setWeightLimitJin(input.weightLimitJin());
    update.setValidDays(INTERNAL_VALID_DAYS);
    update.setStatus(input.status());
    update.setSortOrder(input.sortOrder());
    update.setUpdatedAt(LocalDateTime.now());
    packageTemplateMapper.updateAdminPackageTemplate(update);
    benefitMapper.delete(
      new LambdaQueryWrapper<PackageTemplateBenefitEntity>()
        .eq(PackageTemplateBenefitEntity::getTemplateId, existing.getId())
    );
    replaceBenefits(existing.getId(), benefits, LocalDateTime.now());

    PackageTemplateEntity updated = requireTemplate(request.storeId(), existing.getId());
    List<PackageTemplateBenefitEntity> afterBenefits = loadBenefits(existing.getId());
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      existing.getId(),
      "PACKAGE_TEMPLATE_UPDATED",
      templateLogValue(existing, beforeBenefits),
      templateLogValue(updated, afterBenefits)
    );
    return new PackageTemplateResponse(toDto(updated, afterBenefits));
  }

  private Map<String, List<PackageTemplateBenefitEntity>> loadBenefitsByTemplate(
    List<PackageTemplateEntity> templates
  ) {
    if (templates.isEmpty()) {
      return Collections.emptyMap();
    }

    List<String> templateIds = templates
      .stream()
      .map(PackageTemplateEntity::getId)
      .toList();

    return benefitMapper
      .selectList(
        new LambdaQueryWrapper<PackageTemplateBenefitEntity>()
          .in(PackageTemplateBenefitEntity::getTemplateId, templateIds)
          .orderByAsc(PackageTemplateBenefitEntity::getSortOrder)
      )
      .stream()
      .collect(Collectors.groupingBy(PackageTemplateBenefitEntity::getTemplateId));
  }

  private List<PackageTemplateBenefitEntity> loadBenefits(String templateId) {
    return benefitMapper.selectList(
      new LambdaQueryWrapper<PackageTemplateBenefitEntity>()
        .eq(PackageTemplateBenefitEntity::getTemplateId, templateId)
        .orderByAsc(PackageTemplateBenefitEntity::getSortOrder)
        .orderByAsc(PackageTemplateBenefitEntity::getCreatedAt)
    );
  }

  private PackageTemplateListItem toDto(
    PackageTemplateEntity template,
    List<PackageTemplateBenefitEntity> benefits
  ) {
    PackageTemplateListItem item = new PackageTemplateListItem();
    item.setBenefits(benefits.stream().map(this::toBenefitDto).toList());
    item.setCreatedAt(template.getCreatedAt());
    item.setId(template.getId());
    item.setName(template.getName());
    item.setSortOrder(template.getSortOrder());
    item.setStatus(template.getStatus());
    item.setTotalTimes(template.getTotalTimes());
    item.setWeightLimitJin(template.getWeightLimitJin());
    return item;
  }

  private PackageTemplateListItem.TemplateBenefitItem toBenefitDto(
    PackageTemplateBenefitEntity benefit
  ) {
    PackageTemplateListItem.TemplateBenefitItem item =
      new PackageTemplateListItem.TemplateBenefitItem();
    item.setId(benefit.getId());
    item.setKind(benefit.getKind());
    item.setName(benefit.getName());
    item.setShipmentGroup(benefit.getShipmentGroup());
    item.setSortOrder(benefit.getSortOrder());
    item.setTotalQuantity(benefit.getTotalQuantity());
    item.setUnit(benefit.getUnit());
    return item;
  }

  private PackageTemplateEntity requireTemplate(String storeId, String templateId) {
    PackageTemplateEntity template = packageTemplateMapper.selectOne(
      new LambdaQueryWrapper<PackageTemplateEntity>()
        .eq(PackageTemplateEntity::getStoreId, storeId)
        .eq(PackageTemplateEntity::getId, templateId)
        .last("LIMIT 1")
    );
    if (template == null) {
      throw new ApiException("PACKAGE_TEMPLATE_NOT_FOUND", "套餐模板不存在", HttpStatus.NOT_FOUND);
    }
    return template;
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private NormalizedTemplateInput normalizeTemplateInput(
    PackageTemplateRequest request,
    String status
  ) {
    String name = request.name() == null ? "" : request.name().trim();
    if (!StringUtils.hasText(name)) {
      throw new ApiException("NAME_REQUIRED", "请输入套餐名称", HttpStatus.BAD_REQUEST);
    }
    if (request.totalTimes() == null || request.totalTimes() < 1) {
      throw new ApiException("TOTAL_TIMES_INVALID", "套餐次数不正确", HttpStatus.BAD_REQUEST);
    }
    if (request.weightLimitJin() == null || request.weightLimitJin().compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException("WEIGHT_LIMIT_INVALID", "套餐斤数不正确", HttpStatus.BAD_REQUEST);
    }
    Integer sortOrder = request.sortOrder() == null ? 0 : request.sortOrder();
    validateStatus(status);
    return new NormalizedTemplateInput(
      name,
      sortOrder,
      status,
      request.totalTimes(),
      request.weightLimitJin().setScale(2, RoundingMode.HALF_UP)
    );
  }

  private List<NormalizedBenefitInput> normalizeBenefits(
    List<PackageTemplateBenefitRequest> benefits
  ) {
    if (benefits == null || benefits.isEmpty()) {
      return List.of();
    }
    return IntStream
      .range(0, benefits.size())
      .mapToObj(index -> normalizeBenefit(benefits.get(index), index))
      .toList();
  }

  private NormalizedBenefitInput normalizeBenefit(
    PackageTemplateBenefitRequest benefit,
    int index
  ) {
    String kind = benefit.kind() == null ? "EXTRA" : benefit.kind().trim();
    if (!StringUtils.hasText(kind)) {
      kind = "EXTRA";
    }
    String name = benefit.name() == null ? "" : benefit.name().trim();
    if (!StringUtils.hasText(name)) {
      throw new ApiException("BENEFIT_NAME_REQUIRED", "请输入附加权益名称", HttpStatus.BAD_REQUEST);
    }
    String unit = benefit.unit() == null ? "" : benefit.unit().trim();
    if (!StringUtils.hasText(unit)) {
      throw new ApiException("BENEFIT_UNIT_REQUIRED", "请输入附加权益单位", HttpStatus.BAD_REQUEST);
    }
    if (benefit.totalQuantity() == null || benefit.totalQuantity().compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException(
        "BENEFIT_QUANTITY_INVALID",
        "附加权益数量不正确",
        HttpStatus.BAD_REQUEST
      );
    }
    Integer sortOrder = benefit.sortOrder() == null ? index : benefit.sortOrder();
    return new NormalizedBenefitInput(
      kind,
      name,
      name,
      sortOrder,
      benefit.totalQuantity().setScale(2, RoundingMode.HALF_UP),
      unit
    );
  }

  private void replaceBenefits(
    String templateId,
    List<NormalizedBenefitInput> benefits,
    LocalDateTime now
  ) {
    for (NormalizedBenefitInput benefit : benefits) {
      PackageTemplateBenefitEntity entity = new PackageTemplateBenefitEntity();
      entity.setId(id());
      entity.setTemplateId(templateId);
      entity.setKind(benefit.kind());
      entity.setName(benefit.name());
      entity.setUnit(benefit.unit());
      entity.setTotalQuantity(benefit.totalQuantity());
      entity.setSortOrder(benefit.sortOrder());
      entity.setShipmentGroup(benefit.shipmentGroup());
      entity.setCreatedAt(now);
      entity.setUpdatedAt(now);
      benefitMapper.insert(entity);
    }
  }

  private void validateStatus(String status) {
    if (!StringUtils.hasText(status) || !TEMPLATE_STATUSES.contains(status.trim())) {
      throw new ApiException("STATUS_INVALID", "套餐模板状态不正确", HttpStatus.BAD_REQUEST);
    }
  }

  private Map<String, Object> templateLogValue(
    PackageTemplateEntity template,
    List<PackageTemplateBenefitEntity> benefits
  ) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("benefits", benefits.stream().map(this::benefitLogValue).toList());
    value.put("name", template.getName());
    value.put("sortOrder", template.getSortOrder());
    value.put("status", template.getStatus());
    value.put("totalTimes", template.getTotalTimes());
    value.put("validDays", template.getValidDays());
    value.put(
      "weightLimitJin",
      template.getWeightLimitJin() == null ? null : template.getWeightLimitJin().toPlainString()
    );
    return value;
  }

  private Map<String, Object> benefitLogValue(PackageTemplateBenefitEntity benefit) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("kind", benefit.getKind());
    value.put("name", benefit.getName());
    value.put("shipmentGroup", benefit.getShipmentGroup());
    value.put("sortOrder", benefit.getSortOrder());
    value.put(
      "totalQuantity",
      benefit.getTotalQuantity() == null ? null : benefit.getTotalQuantity().toPlainString()
    );
    value.put("unit", benefit.getUnit());
    return value;
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String templateId,
    String action,
    Object beforeValue,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource("package_template");
    log.setResourceId(templateId);
    log.setAction(action);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams("{}");
    log.setResponseData("{}");
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private String toJson(Object value) {
    try {
      return value == null ? "null" : objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      return "{}";
    }
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private record NormalizedTemplateInput(
    String name,
    Integer sortOrder,
    String status,
    Integer totalTimes,
    BigDecimal weightLimitJin
  ) {}

  private record NormalizedBenefitInput(
    String kind,
    String name,
    String shipmentGroup,
    Integer sortOrder,
    BigDecimal totalQuantity,
    String unit
  ) {}
}
