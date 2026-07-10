package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminOrderItemDto;
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
import cn.hentor.vegetables.entity.AddressEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderItemEntity;
import cn.hentor.vegetables.entity.PackageOperationLogEntity;
import cn.hentor.vegetables.entity.PackageTemplateBenefitEntity;
import cn.hentor.vegetables.entity.PackageTemplateEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.entity.UserPackageBenefitEntity;
import cn.hentor.vegetables.entity.UserPackageEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.AddressMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.OrderItemMapper;
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
  private final AddressMapper addressMapper;
  private final ChinaRegionService chinaRegionService;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final ObjectMapper objectMapper;
  private final OrderItemMapper orderItemMapper;
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
    AddressMapper addressMapper,
    ChinaRegionService chinaRegionService,
    MemberStoreBindingMapper memberStoreBindingMapper,
    ObjectMapper objectMapper,
    OrderItemMapper orderItemMapper,
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
    this.addressMapper = addressMapper;
    this.chinaRegionService = chinaRegionService;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.objectMapper = objectMapper;
    this.orderItemMapper = orderItemMapper;
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
        .selectAs(UserEntity::getAvatarUrl, UserPackageListItem::getUserAvatarUrl)
        .selectAs(UserEntity::getNickname, UserPackageListItem::getUserNickname)
        .selectAs(UserEntity::getPhone, UserPackageListItem::getUserPhone)
        .selectAs(UserEntity::getStatus, UserPackageListItem::getUserStatus)
        .leftJoin(UserEntity.class, UserEntity::getId, UserPackageEntity::getUserId)
        .eq(UserPackageEntity::getStoreId, storeId)
        .orderByDesc(UserPackageEntity::getCreatedAt)
        .orderByDesc(UserPackageEntity::getId);

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
      totalPages,
      userPackageSummary(storeId)
    );
  }

  private Map<String, Long> userPackageSummary(String storeId) {
    long active = countUserPackagesByStatus(storeId, "ACTIVE");
    long frozen = countUserPackagesByStatus(storeId, "FROZEN");
    long unavailable =
      countUserPackagesByStatus(storeId, "EXPIRED") + countUserPackagesByStatus(storeId, "USED_UP");
    return Map.of(
      "active", active,
      "expired", unavailable,
      "frozen", frozen,
      "total", countUserPackagesByStatus(storeId, null)
    );
  }

  private long countUserPackagesByStatus(String storeId, String status) {
    LambdaQueryWrapper<UserPackageEntity> wrapper = new LambdaQueryWrapper<UserPackageEntity>()
      .eq(UserPackageEntity::getStoreId, storeId);
    if (StringUtils.hasText(status)) {
      wrapper.eq(UserPackageEntity::getStatus, status);
    }
    Long count = userPackageMapper.selectCount(wrapper);
    return count == null ? 0 : count;
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
    Map<String, List<OrderItemEntity>> orderItemsByOrderId = loadOrderItemsByOrderId(orders);
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
          orderItemsByOrderId
            .getOrDefault(order.getId(), List.of())
            .stream()
            .map(this::toOrderItemDto)
            .toList(),
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

  private Map<String, List<OrderItemEntity>> loadOrderItemsByOrderId(List<OrderEntity> orders) {
    List<String> orderIds = orders.stream().map(OrderEntity::getId).toList();
    if (orderIds.isEmpty()) {
      return Map.of();
    }

    return orderItemMapper
      .selectList(
        new LambdaQueryWrapper<OrderItemEntity>()
          .in(OrderItemEntity::getOrderId, orderIds)
          .orderByAsc(OrderItemEntity::getId)
      )
      .stream()
      .collect(Collectors.groupingBy(OrderItemEntity::getOrderId));
  }

  private AdminOrderItemDto toOrderItemDto(OrderItemEntity item) {
    return new AdminOrderItemDto(
      item.getDishId(),
      item.getDishNameSnapshot(),
      item.getId(),
      item.getWeightJin()
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

    int totalTimes = template.getTotalTimes();
    int usedTimes = request.usedTimes() == null ? 0 : request.usedTimes();
    BigDecimal weightLimitJin = template.getWeightLimitJin();
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
    List<UserPackageImportRow> validRows = validateImportRows(rows, store, result.failures());

    for (UserPackageImportRow row : validRows) {
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

      MemberStoreBindingEntity binding = findOrCreateBindingByPhone(
        storeId,
        row.phone(),
        row.nickname(),
        result
      );
      upsertImportedDefaultAddress(binding.getUserId(), storeId, row);
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
      "createdBindings",
      response.createdBindings(),
      "createdPackages",
      response.createdPackages(),
      "createdUsers",
      response.createdUsers(),
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
    StoreEntity store,
    List<ImportFailureDto> failures
  ) {
    Set<String> seenRows = new java.util.HashSet<>();
    List<UserPackageImportRow> validRows = new ArrayList<>();
    for (int index = 0; index < rows.size(); index += 1) {
      UserPackageImportRow row = rows.get(index);
      int rowNumber = row.rowNumber() == null ? index + 1 : row.rowNumber();
      String phone = normalizeImportedPhone(row.phone());
      String templateName = trimToNull(row.templateName());
      String nickname = trimToNull(row.nickname());
      ImportedAddress importedAddress = normalizeImportedAddress(row);

      if (!phone.matches("^1\\d{10}$")) {
        failures.add(new ImportFailureDto(trimToNull(row.phone()), "手机号格式不正确", rowNumber, templateName));
        continue;
      }
      if (!StringUtils.hasText(nickname)) {
        failures.add(new ImportFailureDto(phone, "昵称不能为空", rowNumber, templateName));
        continue;
      }
      if (!StringUtils.hasText(templateName)) {
        failures.add(new ImportFailureDto(phone, "套餐模板名称不能为空", rowNumber, null));
        continue;
      }
      if (importedAddress == null) {
        failures.add(new ImportFailureDto(phone, "地址不能为空，请填写省、市、区、详细地址", rowNumber, templateName));
        continue;
      }
      String addressError = validateImportedAddress(importedAddress, store);
      if (StringUtils.hasText(addressError)) {
        failures.add(new ImportFailureDto(phone, addressError, rowNumber, templateName));
        continue;
      }
      String receiverPhone = trimToNull(row.receiverPhone());
      if (StringUtils.hasText(receiverPhone) && !normalizeImportedPhone(receiverPhone).matches("^1\\d{10}$")) {
        failures.add(new ImportFailureDto(phone, "收货电话格式不正确", rowNumber, templateName));
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
        null,
        importedAddress.city(),
        importedAddress.detail(),
        importedAddress.district(),
        nickname,
        phone,
        importedAddress.province(),
        trimToNull(row.receiverName()),
        trimToNull(row.receiverPhone()),
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

  private MemberStoreBindingEntity findOrCreateBindingByPhone(
    String storeId,
    String phone,
    String nickname,
    ImportUserPackageAccumulator result
  ) {
    MemberStoreBindingEntity existingBinding = findBindingByPhone(storeId, phone);
    if (existingBinding != null) {
      updateImportedNickname(existingBinding.getUserId(), nickname, storeId);
      return existingBinding;
    }

    UserEntity user = findUserByPhone(phone);
    LocalDateTime now = LocalDateTime.now();
    boolean shouldUseStoreAsDefault =
      user == null ||
        !StringUtils.hasText(user.getDefaultStoreId()) ||
        storeId.equals(user.getDefaultStoreId());

    if (user == null) {
      user = new UserEntity();
      user.setId(id());
      user.setDefaultStoreId(storeId);
      user.setNickname(nickname);
      user.setOpenid("imported-phone:" + phone);
      user.setPhone(phone);
      user.setStatus("ACTIVE");
      user.setCreatedAt(now);
      user.setUpdatedAt(now);
      userMapper.insert(user);
      result.createdUsers += 1;
    } else {
      UserEntity update = new UserEntity();
      update.setId(user.getId());
      update.setDefaultStoreId(StringUtils.hasText(user.getDefaultStoreId()) ? user.getDefaultStoreId() : storeId);
      update.setNickname(nickname);
      update.setUpdatedAt(now);
      userMapper.updateById(update);
      user = userMapper.selectById(user.getId());
    }

    MemberStoreBindingEntity binding = new MemberStoreBindingEntity();
    binding.setId(id());
    binding.setUserId(user.getId());
    binding.setStoreId(storeId);
    binding.setStatus("ACTIVE");
    binding.setSource("user_package_import");
    binding.setIsDefault(shouldUseStoreAsDefault);
    binding.setCreatedAt(now);
    binding.setUpdatedAt(now);
    memberStoreBindingMapper.insertAdminBinding(binding);
    result.createdBindings += 1;
    return binding;
  }

  private void updateImportedNickname(String userId, String nickname, String storeId) {
    UserEntity user = userMapper.selectById(userId);
    if (user == null || nickname == null || nickname.equals(user.getNickname())) {
      return;
    }
    UserEntity update = new UserEntity();
    update.setId(user.getId());
    update.setDefaultStoreId(StringUtils.hasText(user.getDefaultStoreId()) ? user.getDefaultStoreId() : storeId);
    update.setNickname(nickname);
    update.setUpdatedAt(LocalDateTime.now());
    userMapper.updateById(update);
  }

  private void upsertImportedDefaultAddress(String userId, String storeId, UserPackageImportRow row) {
    LocalDateTime now = LocalDateTime.now();
    AddressEntity existing = addressMapper.selectOne(
      new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getUserId, userId)
        .eq(AddressEntity::getStoreId, storeId)
        .eq(AddressEntity::getIsDefault, true)
        .orderByDesc(AddressEntity::getUpdatedAt)
        .last("LIMIT 1")
    );
    AddressEntity address = new AddressEntity();
    address.setCity(row.city());
    address.setDetail(row.detail());
    address.setDistrict(row.district());
    address.setIsDefault(true);
    address.setProvince(row.province());
    address.setReceiverName(StringUtils.hasText(row.receiverName()) ? row.receiverName() : row.nickname());
    address.setReceiverPhone(StringUtils.hasText(row.receiverPhone()) ? normalizeImportedPhone(row.receiverPhone()) : row.phone());
    address.setStoreId(storeId);
    address.setUpdatedAt(now);

    if (existing == null) {
      address.setId(id());
      address.setUserId(userId);
      address.setCreatedAt(now);
      addressMapper.clearOtherDefaults(address);
      addressMapper.insert(address);
      return;
    }

    address.setId(existing.getId());
    address.setUserId(userId);
    address.setCreatedAt(existing.getCreatedAt());
    addressMapper.clearOtherDefaults(address);
    addressMapper.updateMiniAddress(address);
  }

  private ImportedAddress normalizeImportedAddress(UserPackageImportRow row) {
    String province = trimToNull(row.province());
    String city = trimToNull(row.city());
    String district = trimToNull(row.district());
    String detail = trimToNull(row.detail());
    if (
      StringUtils.hasText(province) ||
        StringUtils.hasText(city) ||
        StringUtils.hasText(district) ||
        StringUtils.hasText(detail)
    ) {
      return new ImportedAddress(province, city, district, detail);
    }

    String address = trimToNull(row.address());
    if (!StringUtils.hasText(address)) {
      return null;
    }
    return parseFullAddress(address);
  }

  private ImportedAddress parseFullAddress(String address) {
    String remaining = address.trim().replaceAll("\\s+", "");
    String province = null;
    for (String candidate : chinaRegionService.provinceNames()) {
      if (remaining.startsWith(candidate)) {
        province = candidate;
        remaining = remaining.substring(candidate.length());
        break;
      }
    }
    if (!StringUtils.hasText(province)) {
      return new ImportedAddress(null, null, null, address);
    }

    String city = null;
    if (chinaRegionService.isDirectCityProvince(province) && remaining.startsWith(province)) {
      city = province;
      remaining = remaining.substring(province.length());
    } else if (chinaRegionService.isDirectCityProvince(province)) {
      city = province;
    } else {
      city = takeRegionPart(remaining, List.of("自治州", "地区", "盟", "市", "州"));
      if (StringUtils.hasText(city)) {
        remaining = remaining.substring(city.length());
      }
    }

    String district = takeRegionPart(remaining, List.of("自治县", "新区", "开发区", "区", "县", "市", "旗"));
    if (StringUtils.hasText(district)) {
      remaining = remaining.substring(district.length());
    }
    return new ImportedAddress(province, city, district, trimToNull(remaining));
  }

  private String takeRegionPart(String value, List<String> suffixes) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    int bestIndex = -1;
    String bestSuffix = null;
    for (String suffix : suffixes) {
      int index = value.indexOf(suffix);
      if (index >= 0 && (bestIndex < 0 || index < bestIndex)) {
        bestIndex = index;
        bestSuffix = suffix;
      }
    }
    return bestIndex < 0 ? null : value.substring(0, bestIndex + bestSuffix.length());
  }

  private String validateImportedAddress(ImportedAddress address, StoreEntity store) {
    if (!StringUtils.hasText(address.province())) {
      return "地址省份不能为空";
    }
    if (!chinaRegionService.isValidProvince(address.province())) {
      return "地址省份不正确：" + address.province();
    }
    if (!StringUtils.hasText(address.city())) {
      return "地址城市不能为空";
    }
    if (!chinaRegionService.isValidCity(address.province(), address.city())) {
      return "地址城市不正确：" + address.province() + " / " + address.city();
    }
    if (!StringUtils.hasText(address.district())) {
      return "地址区县不能为空";
    }
    if (!chinaRegionService.isValidDistrict(address.province(), address.city(), address.district())) {
      return "地址区县不正确：" + address.province() + " / " + address.city() + " / " + address.district();
    }
    if (!StringUtils.hasText(address.detail())) {
      return "详细地址不能为空";
    }

    List<String> provinces = DeliveryRangeSupport.readJsonStringArray(objectMapper, store.getDeliveryProvinces());
    List<String> cities = DeliveryRangeSupport.readJsonStringArray(objectMapper, store.getDeliveryCities());
    if (!DeliveryRangeSupport.allows(address.province(), address.city(), provinces, cities)) {
      return "地址不在配送范围内，仅配送：" + DeliveryRangeSupport.rangeText(provinces, cities);
    }
    return null;
  }

  private UserEntity findUserByPhone(String phone) {
    return userMapper.selectOne(
      new LambdaQueryWrapper<UserEntity>()
        .eq(UserEntity::getPhone, phone)
        .orderByAsc(UserEntity::getCreatedAt)
        .last("LIMIT 1")
    );
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

  private record ImportedAddress(
    String province,
    String city,
    String district,
    String detail
  ) {}

  private static class ImportUserPackageAccumulator {
    private int createdBindings = 0;
    private int createdPackages = 0;
    private int createdUsers = 0;
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
        createdBindings,
        createdPackages,
        createdUsers,
        failedRows,
        List.copyOf(failures),
        importedRows,
        totalRows,
        updatedPackages
      );
    }
  }
}
