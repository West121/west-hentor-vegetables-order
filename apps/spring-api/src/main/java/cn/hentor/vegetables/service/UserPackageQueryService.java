package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.ImportFailureDto;
import cn.hentor.vegetables.dto.UserPackageAdjustRequest;
import cn.hentor.vegetables.dto.UserPackageBenefitDto;
import cn.hentor.vegetables.dto.UserPackageDetailResponse;
import cn.hentor.vegetables.dto.UserPackageImportResultDto;
import cn.hentor.vegetables.dto.UserPackageImportRow;
import cn.hentor.vegetables.dto.UserPackageListItem;
import cn.hentor.vegetables.dto.UserPackageOperationLogDto;
import cn.hentor.vegetables.dto.UserPackageOperationRequest;
import cn.hentor.vegetables.dto.UserPackageRecentOrderDto;
import cn.hentor.vegetables.dto.UserPackageRequest;
import cn.hentor.vegetables.dto.UserPackageResponse;
import cn.hentor.vegetables.dto.UserPackageTemplateDto;
import cn.hentor.vegetables.dto.UserPackageUserDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.PackageOperationLogEntity;
import cn.hentor.vegetables.entity.PackageTemplateBenefitEntity;
import cn.hentor.vegetables.entity.PackageTemplateEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.entity.UserPackageBenefitEntity;
import cn.hentor.vegetables.entity.UserPackageEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.PackageOperationLogMapper;
import cn.hentor.vegetables.mapper.PackageTemplateBenefitMapper;
import cn.hentor.vegetables.mapper.PackageTemplateMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import cn.hentor.vegetables.mapper.UserPackageBenefitMapper;
import cn.hentor.vegetables.mapper.UserPackageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.yulichang.wrapper.MPJLambdaWrapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserPackageQueryService {
  private static final Set<String> PACKAGE_STATUSES = Set.of(
    "ACTIVE",
    "FROZEN",
    "EXPIRED",
    "USED_UP"
  );

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final ObjectMapper objectMapper;
  private final OrderMapper orderMapper;
  private final PackageOperationLogMapper packageOperationLogMapper;
  private final PackageTemplateBenefitMapper packageTemplateBenefitMapper;
  private final PackageTemplateMapper packageTemplateMapper;
  private final StoreMapper storeMapper;
  private final UserMapper userMapper;
  private final UserPackageBenefitMapper userPackageBenefitMapper;
  private final UserPackageMapper userPackageMapper;

  public UserPackageQueryService(
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    ObjectMapper objectMapper,
    OrderMapper orderMapper,
    PackageOperationLogMapper packageOperationLogMapper,
    PackageTemplateBenefitMapper packageTemplateBenefitMapper,
    PackageTemplateMapper packageTemplateMapper,
    StoreMapper storeMapper,
    UserMapper userMapper,
    UserPackageBenefitMapper userPackageBenefitMapper,
    UserPackageMapper userPackageMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.objectMapper = objectMapper;
    this.orderMapper = orderMapper;
    this.packageOperationLogMapper = packageOperationLogMapper;
    this.packageTemplateBenefitMapper = packageTemplateBenefitMapper;
    this.packageTemplateMapper = packageTemplateMapper;
    this.storeMapper = storeMapper;
    this.userMapper = userMapper;
    this.userPackageBenefitMapper = userPackageBenefitMapper;
    this.userPackageMapper = userPackageMapper;
  }

  public PageResult<UserPackageListItem> listUserPackages(
    String storeId,
    String status,
    String query,
    long page,
    long pageSize
  ) {
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    MPJLambdaWrapper<UserPackageEntity> wrapper =
      new MPJLambdaWrapper<UserPackageEntity>()
        .selectAs(UserPackageEntity::getId, UserPackageListItem::getId)
        .selectAs(UserPackageEntity::getUserId, UserPackageListItem::getUserId)
        .selectAs(UserPackageEntity::getNameSnapshot, UserPackageListItem::getNameSnapshot)
        .selectAs(UserPackageEntity::getTotalTimes, UserPackageListItem::getTotalTimes)
        .selectAs(UserPackageEntity::getUsedTimes, UserPackageListItem::getUsedTimes)
        .selectAs(UserPackageEntity::getWeightLimitJin, UserPackageListItem::getWeightLimitJin)
        .selectAs(UserPackageEntity::getStatus, UserPackageListItem::getStatus)
        .selectAs(UserPackageEntity::getFrozenReason, UserPackageListItem::getFrozenReason)
        .selectAs(UserPackageEntity::getLastUsedAt, UserPackageListItem::getLastUsedAt)
        .selectAs(UserPackageEntity::getCreatedAt, UserPackageListItem::getCreatedAt)
        .selectAs(UserEntity::getNickname, UserPackageListItem::getUserNickname)
        .selectAs(UserEntity::getPhone, UserPackageListItem::getUserPhone)
        .selectAs(UserEntity::getStatus, UserPackageListItem::getUserStatus)
        .leftJoin(UserEntity.class, UserEntity::getId, UserPackageEntity::getUserId)
        .eq(UserPackageEntity::getStoreId, storeId)
        .orderByAsc(UserPackageEntity::getStatus)
        .orderByDesc(UserPackageEntity::getUpdatedAt);

    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      validatePackageStatus(status);
      wrapper.apply("t.\"status\" = {0}", status);
    }

    if (StringUtils.hasText(query)) {
      String keyword = query.trim();
      wrapper.and(w -> w
        .like(UserPackageEntity::getNameSnapshot, keyword)
        .or()
        .like(UserEntity::getNickname, keyword)
        .or()
        .like(UserEntity::getPhone, keyword)
      );
    }

    Page<UserPackageListItem> result = userPackageMapper.selectJoinPage(
      new Page<>(normalizedPage, normalizedPageSize),
      UserPackageListItem.class,
      wrapper
    );
    result
      .getRecords()
      .forEach(item -> item.setRemainingTimes(
        Math.max(0, nullToZero(item.getTotalTimes()) - nullToZero(item.getUsedTimes()))
      ));

    long totalPages =
      result.getSize() == 0 ? 0 : (long) Math.ceil((double) result.getTotal() / result.getSize());
    return new PageResult<>(
      result.getRecords(),
      result.getCurrent(),
      result.getSize(),
      result.getTotal(),
      totalPages
    );
  }

  public UserPackageDetailResponse getUserPackage(String storeId, String packageId) {
    UserPackageEntity userPackage = requireUserPackage(storeId, packageId);
    UserEntity user = userMapper.selectById(userPackage.getUserId());
    PackageTemplateEntity template = packageTemplateMapper.selectById(userPackage.getTemplateId());
    List<UserPackageBenefitEntity> benefits = userPackageBenefitMapper.selectList(
      new LambdaQueryWrapper<UserPackageBenefitEntity>()
        .eq(UserPackageBenefitEntity::getUserPackageId, userPackage.getId())
        .orderByAsc(UserPackageBenefitEntity::getSortOrder)
        .orderByAsc(UserPackageBenefitEntity::getCreatedAt)
    );
    List<OrderEntity> orders = orderMapper.selectList(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getUserPackageId, userPackage.getId())
        .orderByDesc(OrderEntity::getCreatedAt)
        .last("LIMIT 10")
    );
    List<PackageOperationLogEntity> logs = packageOperationLogMapper.selectList(
      new LambdaQueryWrapper<PackageOperationLogEntity>()
        .eq(PackageOperationLogEntity::getUserPackageId, userPackage.getId())
        .orderByDesc(PackageOperationLogEntity::getCreatedAt)
        .last("LIMIT 20")
    );
    Map<String, AdminUserEntity> operators = loadOperators(logs);

    return new UserPackageDetailResponse(
      userPackage.getFrozenReason(),
      userPackage.getId(),
      userPackage.getNameSnapshot(),
      remainingTimes(userPackage),
      userPackage.getStatus(),
      userPackage.getTotalTimes(),
      usagePercent(userPackage),
      userPackage.getUsedTimes(),
      userPackage.getWeightLimitJin(),
      userPackage.getCreatedAt(),
      userPackage.getLastUsedAt(),
      userPackage.getStartsAt(),
      userPackage.getUpdatedAt(),
      user == null
        ? null
        : new UserPackageUserDto(
          user.getAvatarUrl(),
          user.getId(),
          user.getNickname(),
          user.getPhone(),
          user.getStatus()
        ),
      template == null
        ? null
        : new UserPackageTemplateDto(
          template.getId(),
          template.getName(),
          template.getTotalTimes(),
          template.getWeightLimitJin()
        ),
      benefits.stream().map(this::toBenefitDto).toList(),
      orders
        .stream()
        .map(order -> new UserPackageRecentOrderDto(
          order.getCreatedAt(),
          order.getId(),
          order.getOrderNo(),
          order.getStatus(),
          order.getTotalWeightJin(),
          order.getUpdatedAt()
        ))
        .toList(),
      logs
        .stream()
        .map(log -> {
          AdminUserEntity operator = operators.get(log.getOperatorId());
          return new UserPackageOperationLogDto(
            log.getAfterValue(),
            log.getBeforeValue(),
            log.getCreatedAt(),
            log.getId(),
            log.getOperatorId(),
            operator == null ? null : operator.getName(),
            operator == null ? null : operator.getUsername(),
            log.getReason()
          );
        })
        .toList()
    );
  }

  @Transactional
  public UserPackageResponse createUserPackage(
    UserPackageRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    String reason = requireReason(request.reason());
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getStoreId, request.storeId())
        .eq(MemberStoreBindingEntity::getUserId, request.userId())
        .last("LIMIT 1")
    );
    if (binding == null) {
      throw new ApiException(
        "MEMBER_NOT_FOUND",
        "会员不存在或未绑定当前数据范围",
        HttpStatus.NOT_FOUND
      );
    }

    PackageTemplateEntity template = packageTemplateMapper.selectOne(
      new LambdaQueryWrapper<PackageTemplateEntity>()
        .eq(PackageTemplateEntity::getId, request.templateId())
        .and(wrapper -> wrapper.eq(PackageTemplateEntity::getStoreId, request.storeId()).or().isNull(PackageTemplateEntity::getStoreId))
        .apply("\"status\" = 'ACTIVE'")
        .last("LIMIT 1")
    );
    if (template == null) {
      throw new ApiException(
        "PACKAGE_TEMPLATE_NOT_FOUND",
        "套餐模板不存在或已停用",
        HttpStatus.NOT_FOUND
      );
    }

    int totalTimes = request.totalTimes() == null ? template.getTotalTimes() : request.totalTimes();
    int usedTimes = request.usedTimes() == null ? 0 : request.usedTimes();
    BigDecimal weightLimitJin =
      request.weightLimitJin() == null ? template.getWeightLimitJin() : request.weightLimitJin();
    requirePackageAdjustment(totalTimes, usedTimes, weightLimitJin);
    String status = StringUtils.hasText(request.status())
      ? request.status().trim()
      : (usedTimes >= totalTimes ? "USED_UP" : "ACTIVE");
    validatePackageStatus(status);

    LocalDateTime now = LocalDateTime.now();
    UserPackageEntity userPackage = new UserPackageEntity();
    userPackage.setId(id());
    userPackage.setUserId(binding.getUserId());
    userPackage.setStoreId(request.storeId());
    userPackage.setTemplateId(template.getId());
    userPackage.setNameSnapshot(template.getName());
    userPackage.setTotalTimes(totalTimes);
    userPackage.setUsedTimes(usedTimes);
    userPackage.setWeightLimitJin(normalizeDecimal(weightLimitJin));
    userPackage.setStatus(status);
    userPackage.setFrozenReason("FROZEN".equals(status) ? reason : null);
    userPackage.setStartsAt(now);
    userPackage.setExpiresAt(farFuturePackageExpiry());
    userPackage.setCreatedAt(now);
    userPackage.setUpdatedAt(now);
    userPackageMapper.insertAdminUserPackage(userPackage);

    copyTemplateBenefits(template.getId(), userPackage.getId(), now);
    writePackageOperationLog(
      userPackage.getId(),
      null,
      packageLogValue(userPackage),
      reason,
      operator.getId()
    );

    return toResponse(requireUserPackage(request.storeId(), userPackage.getId()));
  }

  @Transactional
  public UserPackageImportResultDto importUserPackages(
    String storeId,
    List<UserPackageImportRow> rows,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "数据范围不存在", HttpStatus.NOT_FOUND);
    }

    ImportUserPackageAccumulator result = new ImportUserPackageAccumulator(rows.size());
    List<UserPackageImportRow> validRows = validateImportRows(rows, result.failures());

    for (UserPackageImportRow row : validRows) {
      MemberStoreBindingEntity binding = findBindingByPhone(storeId, row.phone());
      if (binding == null) {
        result.failures().add(new ImportFailureDto(
          row.phone(),
          "会员不存在或未绑定当前数据范围",
          row.rowNumber(),
          row.templateName()
        ));
        continue;
      }

      List<PackageTemplateEntity> templates = findActiveTemplates(storeId, row.templateName());
      if (templates.isEmpty()) {
        result.failures().add(new ImportFailureDto(
          row.phone(),
          "套餐模板不存在或已停用",
          row.rowNumber(),
          row.templateName()
        ));
        continue;
      }
      if (templates.size() > 1) {
        result.failures().add(new ImportFailureDto(
          row.phone(),
          "套餐模板名称匹配到多个模板，请填写完整名称",
          row.rowNumber(),
          row.templateName()
        ));
        continue;
      }

      PackageTemplateEntity template = templates.getFirst();
      int totalTimes = row.totalTimes() == null ? template.getTotalTimes() : row.totalTimes();
      int usedTimes = row.usedTimes() == null ? 0 : row.usedTimes();
      BigDecimal weightLimitJin = row.weightLimitJin() == null
        ? template.getWeightLimitJin()
        : row.weightLimitJin();
      if (usedTimes > totalTimes) {
        result.failures().add(new ImportFailureDto(
          row.phone(),
          "已用次数不能超过套餐总次数",
          row.rowNumber(),
          row.templateName()
        ));
        continue;
      }

      String status = row.status() == null ? (usedTimes >= totalTimes ? "USED_UP" : "ACTIVE") : row.status();
      String reason = row.remark() == null ? "会员套餐导入" : row.remark();
      UserPackageEntity created = createImportedPackage(
        binding.getUserId(),
        storeId,
        template,
        totalTimes,
        usedTimes,
        weightLimitJin,
        status,
        reason
      );
      writePackageOperationLog(
        created.getId(),
        null,
        packageLogValue(created),
        reason,
        operator.getId()
      );
      result.createdPackages += 1;
      result.importedRows += 1;
    }

    result.failedRows = result.failures().size();
    UserPackageImportResultDto response = result.toDto();
    writeAdminImportLog(operator.getId(), storeId, rows.size(), Map.of(
      "createdPackages",
      response.createdPackages(),
      "failedRows",
      response.failedRows(),
      "failureSamples",
      response.failures().stream().limit(20).toList(),
      "importedRows",
      response.importedRows(),
      "totalRows",
      response.totalRows(),
      "updatedPackages",
      response.updatedPackages()
    ));
    return response;
  }

  @Transactional
  public UserPackageResponse adjustUserPackage(
    String packageId,
    UserPackageAdjustRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    String reason = requireReason(request.reason());
    requirePackageAdjustment(request.totalTimes(), request.usedTimes(), request.weightLimitJin());
    UserPackageEntity existing = requireUserPackage(request.storeId(), packageId);

    UserPackageEntity update = new UserPackageEntity();
    update.setId(existing.getId());
    update.setTotalTimes(request.totalTimes());
    update.setUsedTimes(request.usedTimes());
    update.setWeightLimitJin(normalizeDecimal(request.weightLimitJin()));
    update.setUpdatedAt(LocalDateTime.now());
    userPackageMapper.updateAdminUserPackageAdjustment(update);
    UserPackageEntity updated = requireUserPackage(request.storeId(), packageId);
    writePackageOperationLog(
      existing.getId(),
      packageLogValue(existing),
      packageLogValue(updated),
      reason,
      operator.getId()
    );
    return toResponse(updated);
  }

  @Transactional
  public UserPackageResponse freezeUserPackage(
    String packageId,
    UserPackageOperationRequest request,
    AdminSessionDto session
  ) {
    return updateStatus(packageId, request, session, "FROZEN");
  }

  @Transactional
  public UserPackageResponse unfreezeUserPackage(
    String packageId,
    UserPackageOperationRequest request,
    AdminSessionDto session
  ) {
    return updateStatus(packageId, request, session, "ACTIVE");
  }

  @Transactional
  public UserPackageResponse deleteUserPackage(
    String packageId,
    UserPackageOperationRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    String reason = requireReason(request.reason());
    UserPackageEntity existing = requireUserPackage(request.storeId(), packageId);
    Long orderCount = orderMapper.selectCount(
      new LambdaQueryWrapper<OrderEntity>().eq(OrderEntity::getUserPackageId, existing.getId())
    );
    if (orderCount != null && orderCount > 0) {
      throw new ApiException(
        "USER_PACKAGE_HAS_ORDERS",
        "已有订单记录的套餐不能删除，请冻结后保留历史",
        HttpStatus.CONFLICT
      );
    }

    UserPackageResponse response = toResponse(existing);
    writeAdminDeleteLog(existing, operator.getId(), reason);
    packageOperationLogMapper.delete(
      new LambdaQueryWrapper<PackageOperationLogEntity>()
        .eq(PackageOperationLogEntity::getUserPackageId, existing.getId())
    );
    userPackageBenefitMapper.delete(
      new LambdaQueryWrapper<UserPackageBenefitEntity>()
        .eq(UserPackageBenefitEntity::getUserPackageId, existing.getId())
    );
    userPackageMapper.deleteAdminUserPackage(existing.getId());
    return response;
  }

  private UserPackageResponse updateStatus(
    String packageId,
    UserPackageOperationRequest request,
    AdminSessionDto session,
    String status
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    String reason = requireReason(request.reason());
    UserPackageEntity existing = requireUserPackage(request.storeId(), packageId);
    UserPackageEntity update = new UserPackageEntity();
    update.setId(existing.getId());
    update.setStatus(status);
    update.setFrozenReason("FROZEN".equals(status) ? reason : null);
    update.setUpdatedAt(LocalDateTime.now());
    userPackageMapper.updateAdminUserPackageStatus(update);
    UserPackageEntity updated = requireUserPackage(request.storeId(), packageId);
    writePackageOperationLog(
      existing.getId(),
      statusLogValue(existing),
      statusLogValue(updated),
      reason,
      operator.getId()
    );
    return toResponse(updated);
  }

  private void copyTemplateBenefits(String templateId, String userPackageId, LocalDateTime now) {
    List<PackageTemplateBenefitEntity> benefits = packageTemplateBenefitMapper.selectList(
      new LambdaQueryWrapper<PackageTemplateBenefitEntity>()
        .eq(PackageTemplateBenefitEntity::getTemplateId, templateId)
        .orderByAsc(PackageTemplateBenefitEntity::getSortOrder)
        .orderByAsc(PackageTemplateBenefitEntity::getCreatedAt)
    );
    for (PackageTemplateBenefitEntity benefit : benefits) {
      UserPackageBenefitEntity userBenefit = new UserPackageBenefitEntity();
      userBenefit.setId(id());
      userBenefit.setUserPackageId(userPackageId);
      userBenefit.setTemplateBenefitId(benefit.getId());
      userBenefit.setKind(benefit.getKind());
      userBenefit.setNameSnapshot(benefit.getName());
      userBenefit.setUnitSnapshot(benefit.getUnit());
      userBenefit.setTotalQuantity(benefit.getTotalQuantity());
      userBenefit.setUsedQuantity(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
      userBenefit.setSortOrder(benefit.getSortOrder());
      userBenefit.setShipmentGroup(benefit.getShipmentGroup());
      userBenefit.setCreatedAt(now);
      userBenefit.setUpdatedAt(now);
      userPackageBenefitMapper.insert(userBenefit);
    }
  }

  private List<UserPackageImportRow> validateImportRows(
    List<UserPackageImportRow> rows,
    List<ImportFailureDto> failures
  ) {
    Set<String> seenRows = new java.util.HashSet<>();
    List<UserPackageImportRow> validRows = new ArrayList<>();
    for (int index = 0; index < rows.size(); index += 1) {
      UserPackageImportRow row = rows.get(index);
      int rowNumber = row.rowNumber() == null ? index + 1 : row.rowNumber();
      String phone = normalizeImportedPhone(row.phone());
      String templateName = trimToNull(row.templateName());

      if (!phone.matches("^1\\d{10}$")) {
        failures.add(new ImportFailureDto(trimToNull(row.phone()), "手机号格式不正确", rowNumber, templateName));
        continue;
      }
      if (!StringUtils.hasText(templateName)) {
        failures.add(new ImportFailureDto(phone, "套餐模板名称不能为空", rowNumber, null));
        continue;
      }
      String duplicateKey = phone + ":" + templateName.toLowerCase();
      if (seenRows.contains(duplicateKey)) {
        failures.add(new ImportFailureDto(phone, "同一批次手机号和套餐重复", rowNumber, templateName));
        continue;
      }
      if (row.totalTimes() != null && row.totalTimes() <= 0) {
        failures.add(new ImportFailureDto(phone, "套餐总次数必须大于 0", rowNumber, templateName));
        continue;
      }
      if (row.usedTimes() != null && row.usedTimes() < 0) {
        failures.add(new ImportFailureDto(phone, "已用次数不正确", rowNumber, templateName));
        continue;
      }
      if (row.weightLimitJin() != null && row.weightLimitJin().compareTo(BigDecimal.ZERO) <= 0) {
        failures.add(new ImportFailureDto(phone, "单次斤数不正确", rowNumber, templateName));
        continue;
      }
      if (row.status() != null && !PACKAGE_STATUSES.contains(row.status())) {
        failures.add(new ImportFailureDto(phone, "套餐状态不正确", rowNumber, templateName));
        continue;
      }

      seenRows.add(duplicateKey);
      validRows.add(new UserPackageImportRow(
        phone,
        trimToNull(row.remark()),
        rowNumber,
        row.status(),
        templateName,
        row.totalTimes(),
        row.usedTimes(),
        row.weightLimitJin()
      ));
    }
    return validRows;
  }

  private MemberStoreBindingEntity findBindingByPhone(String storeId, String phone) {
    List<UserEntity> users = userMapper.selectList(
      new LambdaQueryWrapper<UserEntity>()
        .eq(UserEntity::getPhone, phone)
        .orderByAsc(UserEntity::getCreatedAt)
        .last("LIMIT 10")
    );
    for (UserEntity user : users) {
      MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
        new LambdaQueryWrapper<MemberStoreBindingEntity>()
          .eq(MemberStoreBindingEntity::getStoreId, storeId)
          .eq(MemberStoreBindingEntity::getUserId, user.getId())
          .last("LIMIT 1")
      );
      if (binding != null) {
        return binding;
      }
    }
    return null;
  }

  private List<PackageTemplateEntity> findActiveTemplates(String storeId, String templateName) {
    List<PackageTemplateEntity> exactTemplates = packageTemplateMapper.selectList(
      new LambdaQueryWrapper<PackageTemplateEntity>()
        .eq(PackageTemplateEntity::getStoreId, storeId)
        .apply("\"status\" = 'ACTIVE'")
        .apply("lower(\"name\") = lower({0})", templateName)
        .orderByAsc(PackageTemplateEntity::getCreatedAt)
        .last("LIMIT 2")
    );
    if (!exactTemplates.isEmpty()) {
      return exactTemplates;
    }
    return packageTemplateMapper.selectList(
      new LambdaQueryWrapper<PackageTemplateEntity>()
        .eq(PackageTemplateEntity::getStoreId, storeId)
        .apply("\"status\" = 'ACTIVE'")
        .apply("lower(\"name\") LIKE concat('%', lower({0}), '%')", templateName)
        .orderByAsc(PackageTemplateEntity::getCreatedAt)
        .last("LIMIT 2")
    );
  }

  private UserPackageEntity createImportedPackage(
    String userId,
    String storeId,
    PackageTemplateEntity template,
    int totalTimes,
    int usedTimes,
    BigDecimal weightLimitJin,
    String status,
    String reason
  ) {
    LocalDateTime now = LocalDateTime.now();
    UserPackageEntity userPackage = new UserPackageEntity();
    userPackage.setId(id());
    userPackage.setUserId(userId);
    userPackage.setStoreId(storeId);
    userPackage.setTemplateId(template.getId());
    userPackage.setNameSnapshot(template.getName());
    userPackage.setTotalTimes(totalTimes);
    userPackage.setUsedTimes(usedTimes);
    userPackage.setWeightLimitJin(normalizeDecimal(weightLimitJin));
    userPackage.setStatus(status);
    userPackage.setFrozenReason("FROZEN".equals(status) ? reason : null);
    userPackage.setStartsAt(now);
    userPackage.setExpiresAt(farFuturePackageExpiry());
    userPackage.setCreatedAt(now);
    userPackage.setUpdatedAt(now);
    userPackageMapper.insertAdminUserPackage(userPackage);
    copyTemplateBenefits(template.getId(), userPackage.getId(), now);
    return userPackage;
  }

  private void requirePackageAdjustment(
    Integer totalTimes,
    Integer usedTimes,
    BigDecimal weightLimitJin
  ) {
    if (totalTimes == null || totalTimes < 1) {
      throw new ApiException("TOTAL_TIMES_INVALID", "套餐总次数不正确", HttpStatus.BAD_REQUEST);
    }
    if (usedTimes == null || usedTimes < 0) {
      throw new ApiException("USED_TIMES_INVALID", "已用次数不正确", HttpStatus.BAD_REQUEST);
    }
    if (usedTimes > totalTimes) {
      throw new ApiException(
        "PACKAGE_USAGE_INVALID",
        "已用次数不能超过套餐总次数",
        HttpStatus.BAD_REQUEST
      );
    }
    if (weightLimitJin == null || weightLimitJin.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException("WEIGHT_LIMIT_INVALID", "套餐重量额度不正确", HttpStatus.BAD_REQUEST);
    }
  }

  private UserPackageEntity requireUserPackage(String storeId, String packageId) {
    UserPackageEntity userPackage = userPackageMapper.selectOne(
      new LambdaQueryWrapper<UserPackageEntity>()
        .eq(UserPackageEntity::getId, packageId)
        .eq(UserPackageEntity::getStoreId, storeId)
        .last("LIMIT 1")
    );
    if (userPackage == null) {
      throw new ApiException("USER_PACKAGE_NOT_FOUND", "用户套餐不存在", HttpStatus.NOT_FOUND);
    }
    return userPackage;
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private String requireReason(String reason) {
    String trimmed = reason == null ? "" : reason.trim();
    if (!StringUtils.hasText(trimmed)) {
      throw new ApiException("REASON_REQUIRED", "请输入操作原因", HttpStatus.BAD_REQUEST);
    }
    return trimmed;
  }

  private void validatePackageStatus(String status) {
    if (!StringUtils.hasText(status) || !PACKAGE_STATUSES.contains(status.trim())) {
      throw new ApiException("STATUS_INVALID", "套餐状态不正确", HttpStatus.BAD_REQUEST);
    }
  }

  private BigDecimal normalizeDecimal(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private LocalDateTime farFuturePackageExpiry() {
    return LocalDateTime.of(2099, 12, 31, 23, 59, 59);
  }

  private UserPackageResponse toResponse(UserPackageEntity userPackage) {
    return new UserPackageResponse(
      userPackage.getFrozenReason(),
      userPackage.getId(),
      userPackage.getNameSnapshot(),
      remainingTimes(userPackage),
      userPackage.getStatus(),
      userPackage.getTotalTimes(),
      usagePercent(userPackage),
      userPackage.getUsedTimes(),
      userPackage.getUserId(),
      userPackage.getWeightLimitJin(),
      userPackage.getCreatedAt(),
      userPackage.getUpdatedAt()
    );
  }

  private UserPackageBenefitDto toBenefitDto(UserPackageBenefitEntity benefit) {
    return new UserPackageBenefitDto(
      benefit.getId(),
      benefit.getKind(),
      benefit.getNameSnapshot(),
      benefit.getShipmentGroup(),
      benefit.getSortOrder(),
      benefit.getTotalQuantity(),
      benefit.getUnitSnapshot(),
      benefit.getUsedQuantity()
    );
  }

  private Integer remainingTimes(UserPackageEntity userPackage) {
    return Math.max(0, nullToZero(userPackage.getTotalTimes()) - nullToZero(userPackage.getUsedTimes()));
  }

  private Integer usagePercent(UserPackageEntity userPackage) {
    return nullToZero(userPackage.getTotalTimes()) == 0
      ? 0
      : Math.round((nullToZero(userPackage.getUsedTimes()) * 100f) / nullToZero(userPackage.getTotalTimes()));
  }

  private Map<String, Object> packageLogValue(UserPackageEntity userPackage) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("status", userPackage.getStatus());
    value.put("totalTimes", userPackage.getTotalTimes());
    value.put("usedTimes", userPackage.getUsedTimes());
    value.put(
      "weightLimitJin",
      userPackage.getWeightLimitJin() == null ? null : userPackage.getWeightLimitJin().toPlainString()
    );
    return value;
  }

  private Map<String, Object> statusLogValue(UserPackageEntity userPackage) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("frozenReason", userPackage.getFrozenReason());
    value.put("status", userPackage.getStatus());
    return value;
  }

  private void writePackageOperationLog(
    String packageId,
    Object beforeValue,
    Object afterValue,
    String reason,
    String operatorId
  ) {
    PackageOperationLogEntity log = new PackageOperationLogEntity();
    log.setId(id());
    log.setUserPackageId(packageId);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setReason(reason);
    log.setOperatorId(operatorId);
    log.setCreatedAt(LocalDateTime.now());
    packageOperationLogMapper.insertLog(log);
  }

  private void writeAdminDeleteLog(UserPackageEntity userPackage, String operatorId, String reason) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(userPackage.getStoreId());
    log.setResource("user_package");
    log.setResourceId(userPackage.getId());
    log.setAction("USER_PACKAGE_DELETE");
    log.setBeforeValue(toJson(packageLogValue(userPackage)));
    log.setAfterValue("null");
    log.setRequestParams(toJson(Map.of(
      "reason",
      reason,
      "userPackageId",
      userPackage.getId()
    )));
    log.setResponseData("{}");
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private void writeAdminImportLog(
    String operatorId,
    String storeId,
    int rowCount,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource("user_package");
    log.setAction("USER_PACKAGE_IMPORT");
    log.setBeforeValue("null");
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams(toJson(Map.of("rowCount", rowCount)));
    log.setResponseData("{}");
    log.setStatusCode(200);
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private Map<String, AdminUserEntity> loadOperators(List<PackageOperationLogEntity> logs) {
    List<String> operatorIds = logs
      .stream()
      .map(PackageOperationLogEntity::getOperatorId)
      .filter(StringUtils::hasText)
      .distinct()
      .toList();
    return operatorIds.isEmpty()
      ? Map.of()
      : adminUserMapper
        .selectBatchIds(operatorIds)
        .stream()
        .collect(Collectors.toMap(AdminUserEntity::getId, Function.identity()));
  }

  private String toJson(Object value) {
    try {
      return value == null ? "null" : objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      return "{}";
    }
  }

  private int nullToZero(Integer value) {
    return value == null ? 0 : value;
  }

  private String normalizeImportedPhone(String value) {
    String phone = value == null ? "" : value.trim().replaceAll("[\\s-]", "");
    if (phone.startsWith("+86")) {
      phone = phone.substring(3);
    }
    if (phone.startsWith("86") && phone.length() == 13) {
      phone = phone.substring(2);
    }
    return phone;
  }

  private String trimToNull(String value) {
    String trimmed = value == null ? "" : value.trim();
    return StringUtils.hasText(trimmed) ? trimmed : null;
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private static class ImportUserPackageAccumulator {
    private int createdPackages = 0;
    private int failedRows = 0;
    private final List<ImportFailureDto> failures = new ArrayList<>();
    private int importedRows = 0;
    private final int totalRows;
    private int updatedPackages = 0;

    private ImportUserPackageAccumulator(int totalRows) {
      this.totalRows = totalRows;
    }

    private List<ImportFailureDto> failures() {
      return failures;
    }

    private UserPackageImportResultDto toDto() {
      return new UserPackageImportResultDto(
        createdPackages,
        failedRows,
        List.copyOf(failures),
        importedRows,
        totalRows,
        updatedPackages
      );
    }
  }
}
