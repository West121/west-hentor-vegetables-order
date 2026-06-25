package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.ImportFailureDto;
import cn.hentor.vegetables.dto.MemberAddressDto;
import cn.hentor.vegetables.dto.MemberAddressRequest;
import cn.hentor.vegetables.dto.MemberDetailDto;
import cn.hentor.vegetables.dto.MemberDetailResponse;
import cn.hentor.vegetables.dto.MemberImportResultDto;
import cn.hentor.vegetables.dto.MemberImportRow;
import cn.hentor.vegetables.dto.MemberListItem;
import cn.hentor.vegetables.dto.MemberOrderItemDto;
import cn.hentor.vegetables.dto.MemberPackageDto;
import cn.hentor.vegetables.dto.MemberPackageTemplateDto;
import cn.hentor.vegetables.dto.MemberRecentOrderDto;
import cn.hentor.vegetables.dto.MemberStoreSummaryDto;
import cn.hentor.vegetables.dto.MemberUpdateRequest;
import cn.hentor.vegetables.dto.MemberUpdateResponse;
import cn.hentor.vegetables.dto.MemberUpdatedDto;
import cn.hentor.vegetables.entity.AddressEntity;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderItemEntity;
import cn.hentor.vegetables.entity.PackageTemplateEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.entity.UserPackageEntity;
import cn.hentor.vegetables.mapper.AddressMapper;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.OrderItemMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.PackageTemplateMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import cn.hentor.vegetables.mapper.UserPackageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.yulichang.wrapper.MPJLambdaWrapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
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
public class MemberService {
  private static final Set<String> BINDING_STATUSES = Set.of("ACTIVE", "DISABLED");

  private final AddressMapper addressMapper;
  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final ObjectMapper objectMapper;
  private final OrderItemMapper orderItemMapper;
  private final OrderMapper orderMapper;
  private final PackageTemplateMapper packageTemplateMapper;
  private final StoreMapper storeMapper;
  private final UserMapper userMapper;
  private final UserPackageMapper userPackageMapper;

  public MemberService(
    AddressMapper addressMapper,
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    ObjectMapper objectMapper,
    OrderItemMapper orderItemMapper,
    OrderMapper orderMapper,
    PackageTemplateMapper packageTemplateMapper,
    StoreMapper storeMapper,
    UserMapper userMapper,
    UserPackageMapper userPackageMapper
  ) {
    this.addressMapper = addressMapper;
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.objectMapper = objectMapper;
    this.orderItemMapper = orderItemMapper;
    this.orderMapper = orderMapper;
    this.packageTemplateMapper = packageTemplateMapper;
    this.storeMapper = storeMapper;
    this.userMapper = userMapper;
    this.userPackageMapper = userPackageMapper;
  }

  public PageResult<MemberListItem> listMembers(
    String storeId,
    String status,
    String query,
    long page,
    long pageSize
  ) {
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);

    MPJLambdaWrapper<MemberStoreBindingEntity> wrapper =
      new MPJLambdaWrapper<MemberStoreBindingEntity>()
        .selectAs(MemberStoreBindingEntity::getId, MemberListItem::getBindingId)
        .selectAs(MemberStoreBindingEntity::getUserId, MemberListItem::getUserId)
        .selectAs(MemberStoreBindingEntity::getStatus, MemberListItem::getStatus)
        .selectAs(MemberStoreBindingEntity::getSource, MemberListItem::getSource)
        .selectAs(MemberStoreBindingEntity::getCreatedAt, MemberListItem::getCreatedAt)
        .selectAs(UserEntity::getNickname, MemberListItem::getNickname)
        .selectAs(UserEntity::getAvatarUrl, MemberListItem::getAvatarUrl)
        .selectAs(UserEntity::getPhone, MemberListItem::getPhone)
        .selectAs(UserEntity::getStatus, MemberListItem::getUserStatus)
        .selectAs(UserEntity::getDisabledReason, MemberListItem::getDisabledReason)
        .selectAs(UserEntity::getRemark, MemberListItem::getRemark)
        .leftJoin(UserEntity.class, UserEntity::getId, MemberStoreBindingEntity::getUserId)
        .eq(MemberStoreBindingEntity::getStoreId, storeId)
        .orderByDesc(MemberStoreBindingEntity::getCreatedAt);

    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      wrapper.eq(MemberStoreBindingEntity::getStatus, status);
    }

    if (StringUtils.hasText(query)) {
      String keyword = query.trim();
      wrapper.and(w -> w
        .like(UserEntity::getNickname, keyword)
        .or()
        .like(UserEntity::getPhone, keyword)
        .or()
        .like(UserEntity::getRemark, keyword)
      );
    }

    Page<MemberListItem> result = memberStoreBindingMapper.selectJoinPage(
      new Page<>(normalizedPage, normalizedPageSize),
      MemberListItem.class,
      wrapper
    );
    enrichMemberListItems(storeId, result.getRecords());

    return toPageResult(result);
  }

  public MemberDetailResponse getMember(String storeId, String userId) {
    MemberStoreBindingEntity binding = requireBinding(storeId, userId);
    UserEntity user = requireUser(userId);
    StoreEntity store = requireStore(storeId);
    List<AddressEntity> addresses = addressMapper.selectList(
      new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getStoreId, storeId)
        .eq(AddressEntity::getUserId, userId)
        .orderByDesc(AddressEntity::getIsDefault)
        .orderByDesc(AddressEntity::getCreatedAt)
    );
    AddressEntity defaultAddress = defaultAddress(addresses);
    List<UserPackageEntity> packages = userPackageMapper.selectList(
      new LambdaQueryWrapper<UserPackageEntity>()
        .eq(UserPackageEntity::getStoreId, storeId)
        .eq(UserPackageEntity::getUserId, userId)
        .orderByDesc(UserPackageEntity::getUpdatedAt)
    );
    Map<String, PackageTemplateEntity> templateMap = loadTemplateMap(packages);
    List<MemberPackageDto> packageDtos = packages
      .stream()
      .map(userPackage -> toPackageDto(userPackage, templateMap.get(userPackage.getTemplateId())))
      .toList();
    MemberPackageDto latestActivePackage = packageDtos
      .stream()
      .filter(userPackage -> "ACTIVE".equals(userPackage.status()))
      .findFirst()
      .orElse(null);
    List<OrderEntity> orders = orderMapper.selectList(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getStoreId, storeId)
        .eq(OrderEntity::getUserId, userId)
        .isNull(OrderEntity::getDeletedByUserAt)
        .orderByDesc(OrderEntity::getCreatedAt)
        .last("limit 10")
    );
    Map<String, List<MemberOrderItemDto>> orderItems = loadOrderItems(orders);
    List<MemberRecentOrderDto> recentOrders = orders
      .stream()
      .map(order -> new MemberRecentOrderDto(
        order.getCreatedAt(),
        order.getId(),
        orderItems.getOrDefault(order.getId(), List.of()),
        order.getOrderNo(),
        order.getStatus(),
        order.getTotalWeightJin(),
        order.getUpdatedAt(),
        order.getUserPackageId()
      ))
      .toList();
    Long orderCount = orderMapper.selectCount(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getStoreId, storeId)
        .eq(OrderEntity::getUserId, userId)
        .isNull(OrderEntity::getDeletedByUserAt)
    );

    return new MemberDetailResponse(new MemberDetailDto(
      Math.toIntExact(packages.stream().filter(userPackage -> "ACTIVE".equals(userPackage.getStatus())).count()),
      addresses.stream().map(this::toAddressDto).toList(),
      user.getAvatarUrl(),
      binding.getId(),
      binding.getStatus(),
      binding.getCreatedAt(),
      toAddressDto(defaultAddress),
      user.getDefaultStoreId(),
      user.getDisabledReason(),
      user.getId(),
      binding.getIsDefault(),
      latestActivePackage,
      user.getNickname(),
      orderCount == null ? 0 : Math.toIntExact(orderCount),
      packageDtos,
      user.getPhone(),
      recentOrders,
      user.getRemark(),
      binding.getSource(),
      user.getStatus(),
      new MemberStoreSummaryDto(store.getCode(), store.getId(), store.getName()),
      binding.getUpdatedAt()
    ));
  }

  @Transactional
  public MemberUpdateResponse updateMember(
    String storeId,
    String userId,
    MemberUpdateRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    if (!BINDING_STATUSES.contains(request.status())) {
      throw new ApiException("INVALID_PARAMS", "会员状态不正确", HttpStatus.BAD_REQUEST);
    }
    String disabledReason = "DISABLED".equals(request.status())
      ? requireDisabledReason(request.disabledReason())
      : null;
    MemberStoreBindingEntity binding = requireBinding(storeId, userId);
    UserEntity user = requireUser(userId);
    List<AddressEntity> addresses = addressMapper.selectList(
      new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getStoreId, storeId)
        .eq(AddressEntity::getUserId, userId)
        .orderByDesc(AddressEntity::getIsDefault)
        .orderByDesc(AddressEntity::getCreatedAt)
    );
    AddressEntity beforeDefaultAddress = defaultAddress(addresses);
    MemberAddressDto beforeAddressDto = toAddressDto(beforeDefaultAddress);
    String beforeDisabledReason = user.getDisabledReason();
    String beforeRemark = user.getRemark();
    LocalDateTime now = LocalDateTime.now();

    MemberStoreBindingEntity bindingUpdate = new MemberStoreBindingEntity();
    bindingUpdate.setId(binding.getId());
    bindingUpdate.setStatus(request.status());
    bindingUpdate.setIsDefault(binding.getIsDefault());
    bindingUpdate.setUpdatedAt(now);
    memberStoreBindingMapper.updateAdminBinding(bindingUpdate);

    String remark = trimToNull(request.remark());
    userMapper.updateAdminMemberProfile(userId, disabledReason, remark, now);

    AddressEntity updatedDefaultAddress = beforeDefaultAddress;
    AddressEntity normalizedAddress = normalizeMemberAddressInput(request.defaultAddress(), user, storeId);
    if (normalizedAddress != null) {
      String addressId = beforeDefaultAddress == null ? id() : beforeDefaultAddress.getId();
      normalizedAddress.setId(addressId);
      normalizedAddress.setUserId(userId);
      normalizedAddress.setStoreId(storeId);
      normalizedAddress.setIsDefault(true);
      normalizedAddress.setUpdatedAt(now);
      addressMapper.clearOtherDefaults(normalizedAddress);
      if (beforeDefaultAddress == null) {
        normalizedAddress.setCreatedAt(now);
        addressMapper.insert(normalizedAddress);
      } else {
        addressMapper.updateMiniAddress(normalizedAddress);
      }
      updatedDefaultAddress = normalizedAddress;
    }

    MemberAddressDto afterAddressDto = toAddressDto(updatedDefaultAddress);
    writeMemberUpdateLog(
      operator.getId(),
      storeId,
      userId,
      binding.getStatus(),
      beforeAddressDto,
      beforeDisabledReason,
      beforeRemark,
      request.status(),
      afterAddressDto,
      disabledReason,
      remark
    );
    return new MemberUpdateResponse(new MemberUpdatedDto(
      request.status(),
      afterAddressDto,
      disabledReason,
      userId,
      remark
    ));
  }

  @Transactional
  public MemberImportResultDto importMembers(
    String storeId,
    List<MemberImportRow> rows,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }

    ImportMemberAccumulator result = new ImportMemberAccumulator(rows.size());
    List<MemberImportRow> validRows = validateMemberRows(rows, result.failures());

    for (MemberImportRow row : validRows) {
      UserEntity existingUser = findImportUser(storeId, row.phone());
      boolean shouldUseStoreAsDefault =
        existingUser == null ||
          !StringUtils.hasText(existingUser.getDefaultStoreId()) ||
          storeId.equals(existingUser.getDefaultStoreId());

      UserEntity user = existingUser == null
        ? createImportedUser(storeId, row)
        : updateImportedUser(existingUser, storeId, row);
      if (existingUser == null) {
        result.createdUsers += 1;
      } else if (hasUserUpdates(existingUser, row, storeId)) {
        result.updatedUsers += 1;
      }

      MemberStoreBindingEntity existingBinding = memberStoreBindingMapper.selectOne(
        new LambdaQueryWrapper<MemberStoreBindingEntity>()
          .eq(MemberStoreBindingEntity::getStoreId, storeId)
          .eq(MemberStoreBindingEntity::getUserId, user.getId())
          .last("LIMIT 1")
      );
      if (existingBinding == null) {
        MemberStoreBindingEntity binding = new MemberStoreBindingEntity();
        LocalDateTime now = LocalDateTime.now();
        binding.setId(id());
        binding.setUserId(user.getId());
        binding.setStoreId(storeId);
        binding.setStatus(row.status());
        binding.setSource("member_import");
        binding.setIsDefault(shouldUseStoreAsDefault);
        binding.setCreatedAt(now);
        binding.setUpdatedAt(now);
        memberStoreBindingMapper.insertAdminBinding(binding);
        result.createdBindings += 1;
      } else {
        MemberStoreBindingEntity update = new MemberStoreBindingEntity();
        update.setId(existingBinding.getId());
        update.setStatus(row.status());
        update.setIsDefault(shouldUseStoreAsDefault);
        update.setUpdatedAt(LocalDateTime.now());
        memberStoreBindingMapper.updateAdminBinding(update);
        result.updatedBindings += 1;
      }
      result.importedRows += 1;
    }

    result.failedRows = result.failures().size();
    MemberImportResultDto response = result.toDto();
    writeImportLog(operator.getId(), storeId, "MEMBER_IMPORT", "member", rows.size(), Map.of(
      "createdBindings",
      response.createdBindings(),
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
      "updatedBindings",
      response.updatedBindings(),
      "updatedUsers",
      response.updatedUsers()
    ));
    return response;
  }

  private MemberStoreBindingEntity requireBinding(String storeId, String userId) {
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getStoreId, storeId)
        .eq(MemberStoreBindingEntity::getUserId, userId)
        .last("limit 1")
    );
    if (binding == null) {
      throw new ApiException("MEMBER_NOT_FOUND", "会员不存在", HttpStatus.NOT_FOUND);
    }
    return binding;
  }

  private StoreEntity requireStore(String storeId) {
    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }
    return store;
  }

  private UserEntity requireUser(String userId) {
    UserEntity user = userMapper.selectById(userId);
    if (user == null) {
      throw new ApiException("MEMBER_NOT_FOUND", "会员不存在", HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private AddressEntity defaultAddress(List<AddressEntity> addresses) {
    if (addresses.isEmpty()) {
      return null;
    }
    return addresses
      .stream()
      .filter(address -> Boolean.TRUE.equals(address.getIsDefault()))
      .findFirst()
      .orElse(addresses.getFirst());
  }

  private Map<String, PackageTemplateEntity> loadTemplateMap(List<UserPackageEntity> packages) {
    List<String> templateIds = packages
      .stream()
      .map(UserPackageEntity::getTemplateId)
      .filter(StringUtils::hasText)
      .distinct()
      .toList();
    if (templateIds.isEmpty()) {
      return Collections.emptyMap();
    }
    return packageTemplateMapper
      .selectList(new LambdaQueryWrapper<PackageTemplateEntity>().in(PackageTemplateEntity::getId, templateIds))
      .stream()
      .collect(Collectors.toMap(PackageTemplateEntity::getId, Function.identity(), (left, right) -> left));
  }

  private Map<String, List<MemberOrderItemDto>> loadOrderItems(List<OrderEntity> orders) {
    if (orders.isEmpty()) {
      return Collections.emptyMap();
    }
    List<String> orderIds = orders.stream().map(OrderEntity::getId).toList();
    Map<String, List<MemberOrderItemDto>> result = new HashMap<>();
    for (OrderItemEntity item : orderItemMapper.selectList(
      new LambdaQueryWrapper<OrderItemEntity>().in(OrderItemEntity::getOrderId, orderIds)
    )) {
      result
        .computeIfAbsent(item.getOrderId(), ignored -> new ArrayList<>())
        .add(new MemberOrderItemDto(item.getDishNameSnapshot(), item.getWeightJin()));
    }
    return result;
  }

  private MemberPackageDto toPackageDto(
    UserPackageEntity userPackage,
    PackageTemplateEntity template
  ) {
    return new MemberPackageDto(
      userPackage.getCreatedAt(),
      userPackage.getFrozenReason(),
      userPackage.getId(),
      userPackage.getLastUsedAt(),
      userPackage.getNameSnapshot(),
      Math.max(userPackage.getTotalTimes() - userPackage.getUsedTimes(), 0),
      userPackage.getStatus(),
      template == null ? null : new MemberPackageTemplateDto(template.getId(), template.getName()),
      userPackage.getTotalTimes(),
      userPackage.getUpdatedAt(),
      userPackage.getUsedTimes(),
      userPackage.getWeightLimitJin()
    );
  }

  private MemberAddressDto toAddressDto(AddressEntity address) {
    if (address == null) {
      return null;
    }
    return new MemberAddressDto(
      address.getCity(),
      address.getCreatedAt(),
      address.getDetail(),
      address.getDistrict(),
      address.getId(),
      address.getIsDefault(),
      address.getProvince(),
      address.getReceiverName(),
      address.getReceiverPhone(),
      address.getUpdatedAt()
    );
  }

  private AddressEntity normalizeMemberAddressInput(
    MemberAddressRequest input,
    UserEntity fallback,
    String storeId
  ) {
    if (!hasAddressInput(input)) {
      return null;
    }
    String detail = trimToNull(input.detail());
    String receiverName = trimToNull(input.receiverName());
    if (!StringUtils.hasText(receiverName)) {
      receiverName = trimToNull(fallback.getNickname());
    }
    String receiverPhone = trimToNull(input.receiverPhone());
    if (!StringUtils.hasText(receiverPhone)) {
      receiverPhone = trimToNull(fallback.getPhone());
    }
    if (!StringUtils.hasText(detail)) {
      throw new ApiException("ADDRESS_DETAIL_REQUIRED", "请输入详细地址", HttpStatus.BAD_REQUEST);
    }
    if (!StringUtils.hasText(receiverName)) {
      throw new ApiException("RECEIVER_NAME_REQUIRED", "请输入收货人", HttpStatus.BAD_REQUEST);
    }
    if (!StringUtils.hasText(receiverPhone)) {
      throw new ApiException("RECEIVER_PHONE_REQUIRED", "请输入联系电话", HttpStatus.BAD_REQUEST);
    }

    AddressEntity address = new AddressEntity();
    address.setCity(trimToNull(input.city()));
    address.setDetail(detail);
    address.setDistrict(trimToNull(input.district()));
    address.setProvince(trimToNull(input.province()));
    address.setReceiverName(receiverName);
    address.setReceiverPhone(receiverPhone);
    address.setStoreId(storeId);
    return address;
  }

  private boolean hasAddressInput(MemberAddressRequest input) {
    if (input == null) {
      return false;
    }
    return StringUtils.hasText(input.id()) ||
      StringUtils.hasText(input.city()) ||
      StringUtils.hasText(input.detail()) ||
      StringUtils.hasText(input.district()) ||
      StringUtils.hasText(input.province()) ||
      StringUtils.hasText(input.receiverName()) ||
      StringUtils.hasText(input.receiverPhone());
  }

  private List<MemberImportRow> validateMemberRows(
    List<MemberImportRow> rows,
    List<ImportFailureDto> failures
  ) {
    Set<String> seenPhones = new java.util.HashSet<>();
    List<MemberImportRow> validRows = new ArrayList<>();
    for (int index = 0; index < rows.size(); index += 1) {
      MemberImportRow row = rows.get(index);
      int rowNumber = row.rowNumber() == null ? index + 1 : row.rowNumber();
      String phone = normalizeImportedPhone(row.phone());
      if (!phone.matches("^1\\d{10}$")) {
        failures.add(new ImportFailureDto(trimToNull(row.phone()), "手机号格式不正确", rowNumber, null));
        continue;
      }
      if (seenPhones.contains(phone)) {
        failures.add(new ImportFailureDto(phone, "同一批次手机号重复", rowNumber, null));
        continue;
      }
      String status = StringUtils.hasText(row.status()) ? row.status() : "ACTIVE";
      if (!BINDING_STATUSES.contains(status)) {
        status = "ACTIVE";
      }
      String disabledReason = trimToNull(row.disabledReason());
      if ("DISABLED".equals(status) && !StringUtils.hasText(disabledReason)) {
        failures.add(new ImportFailureDto(phone, "停用会员时必须填写停用原因", rowNumber, null));
        continue;
      }
      seenPhones.add(phone);
      validRows.add(new MemberImportRow(
        disabledReason,
        trimToNull(row.nickname()),
        phone,
        trimToNull(row.remark()),
        rowNumber,
        status
      ));
    }
    return validRows;
  }

  private String requireDisabledReason(String disabledReason) {
    String reason = trimToNull(disabledReason);
    if (!StringUtils.hasText(reason)) {
      throw new ApiException("DISABLED_REASON_REQUIRED", "停用会员时必须填写停用原因", HttpStatus.BAD_REQUEST);
    }
    return reason;
  }

  private UserEntity findImportUser(String storeId, String phone) {
    List<UserEntity> candidates = userMapper.selectList(
      new LambdaQueryWrapper<UserEntity>()
        .eq(UserEntity::getPhone, phone)
        .orderByAsc(UserEntity::getCreatedAt)
        .last("LIMIT 10")
    );
    if (candidates.isEmpty()) {
      return null;
    }
    for (UserEntity candidate : candidates) {
      Long bindingCount = memberStoreBindingMapper.selectCount(
        new LambdaQueryWrapper<MemberStoreBindingEntity>()
          .eq(MemberStoreBindingEntity::getStoreId, storeId)
          .eq(MemberStoreBindingEntity::getUserId, candidate.getId())
      );
      if (bindingCount != null && bindingCount > 0) {
        return candidate;
      }
    }
    return candidates.getFirst();
  }

  private UserEntity createImportedUser(String storeId, MemberImportRow row) {
    LocalDateTime now = LocalDateTime.now();
    UserEntity user = new UserEntity();
    user.setId(id());
    user.setDefaultStoreId(storeId);
    user.setDisabledReason("DISABLED".equals(row.status())
      ? (row.disabledReason() == null ? "导入时标记停用" : row.disabledReason())
      : null);
    user.setNickname(row.nickname());
    user.setOpenid("imported-phone:" + row.phone());
    user.setPhone(row.phone());
    user.setRemark(row.remark());
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    userMapper.insert(user);
    return user;
  }

  private UserEntity updateImportedUser(UserEntity existing, String storeId, MemberImportRow row) {
    if (!hasUserUpdates(existing, row, storeId)) {
      return existing;
    }
    UserEntity update = new UserEntity();
    update.setId(existing.getId());
    update.setNickname(row.nickname() == null ? existing.getNickname() : row.nickname());
    update.setRemark(row.remark() == null ? existing.getRemark() : row.remark());
    update.setDefaultStoreId(StringUtils.hasText(existing.getDefaultStoreId()) ? existing.getDefaultStoreId() : storeId);
    update.setDisabledReason("DISABLED".equals(row.status())
      ? (row.disabledReason() == null ? "导入时标记停用" : row.disabledReason())
      : existing.getDisabledReason());
    update.setUpdatedAt(LocalDateTime.now());
    userMapper.updateById(update);
    return userMapper.selectById(existing.getId());
  }

  private boolean hasUserUpdates(UserEntity existing, MemberImportRow row, String storeId) {
    if (row.nickname() != null && !row.nickname().equals(existing.getNickname())) {
      return true;
    }
    if (row.remark() != null && !row.remark().equals(existing.getRemark())) {
      return true;
    }
    if (!StringUtils.hasText(existing.getDefaultStoreId())) {
      return true;
    }
    if ("DISABLED".equals(row.status())) {
      String reason = row.disabledReason() == null ? "导入时标记停用" : row.disabledReason();
      return !reason.equals(existing.getDisabledReason());
    }
    return false;
  }

  private PageResult<MemberListItem> toPageResult(Page<MemberListItem> result) {
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

  private void enrichMemberListItems(String storeId, List<MemberListItem> items) {
    List<String> userIds = items
      .stream()
      .map(MemberListItem::getUserId)
      .filter(StringUtils::hasText)
      .distinct()
      .toList();
    if (userIds.isEmpty()) {
      return;
    }

    Map<String, List<AddressEntity>> addressesByUser = addressMapper
      .selectList(new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getStoreId, storeId)
        .in(AddressEntity::getUserId, userIds)
        .orderByDesc(AddressEntity::getIsDefault)
        .orderByDesc(AddressEntity::getCreatedAt))
      .stream()
      .collect(Collectors.groupingBy(AddressEntity::getUserId));

    List<UserPackageEntity> packages = userPackageMapper.selectList(
      new LambdaQueryWrapper<UserPackageEntity>()
        .eq(UserPackageEntity::getStoreId, storeId)
        .in(UserPackageEntity::getUserId, userIds)
        .orderByDesc(UserPackageEntity::getUpdatedAt)
    );
    Map<String, PackageTemplateEntity> templateMap = loadTemplateMap(packages);
    Map<String, List<MemberPackageDto>> activePackagesByUser = packages
      .stream()
      .filter(userPackage -> "ACTIVE".equals(userPackage.getStatus()))
      .map(userPackage -> Map.entry(
        userPackage.getUserId(),
        toPackageDto(userPackage, templateMap.get(userPackage.getTemplateId()))
      ))
      .collect(Collectors.groupingBy(
        Map.Entry::getKey,
        Collectors.mapping(Map.Entry::getValue, Collectors.toList())
      ));

    Map<String, Long> orderCountByUser = orderMapper
      .selectList(new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getStoreId, storeId)
        .in(OrderEntity::getUserId, userIds)
        .isNull(OrderEntity::getDeletedByUserAt))
      .stream()
      .collect(Collectors.groupingBy(OrderEntity::getUserId, Collectors.counting()));

    for (MemberListItem item : items) {
      List<MemberPackageDto> activePackages = activePackagesByUser.getOrDefault(item.getUserId(), List.of());
      item.setDefaultAddress(toAddressDto(defaultAddress(addressesByUser.getOrDefault(item.getUserId(), List.of()))));
      item.setActivePackageCount(activePackages.size());
      item.setLatestActivePackage(activePackages.isEmpty() ? null : activePackages.getFirst());
      item.setOrderCount(Math.toIntExact(orderCountByUser.getOrDefault(item.getUserId(), 0L)));
    }
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private void writeImportLog(
    String operatorId,
    String storeId,
    String action,
    String resource,
    int rowCount,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource(resource);
    log.setAction(action);
    log.setBeforeValue("null");
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams(toJson(Map.of("rowCount", rowCount)));
    log.setResponseData("{}");
    log.setStatusCode(200);
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private void writeMemberUpdateLog(
    String operatorId,
    String storeId,
    String userId,
    String beforeBindingStatus,
    MemberAddressDto beforeAddress,
    String beforeDisabledReason,
    String beforeRemark,
    String afterBindingStatus,
    MemberAddressDto afterAddress,
    String afterDisabledReason,
    String afterRemark
  ) {
    Map<String, Object> beforeValue = new LinkedHashMap<>();
    beforeValue.put("bindingStatus", beforeBindingStatus);
    beforeValue.put("defaultAddress", beforeAddress);
    beforeValue.put("disabledReason", beforeDisabledReason);
    beforeValue.put("remark", beforeRemark);

    Map<String, Object> afterValue = new LinkedHashMap<>();
    afterValue.put("bindingStatus", afterBindingStatus);
    afterValue.put("defaultAddress", afterAddress);
    afterValue.put("disabledReason", afterDisabledReason);
    afterValue.put("remark", afterRemark);

    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setAction("MEMBER_STORE_BINDING_UPDATED");
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setOperatorId(operatorId);
    log.setResource("member");
    log.setResourceId(userId);
    log.setStoreId(storeId);
    log.setRequestParams(toJson(afterValue));
    log.setResponseData("{}");
    log.setStatusCode(200);
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
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

  private static class ImportMemberAccumulator {
    private int createdBindings = 0;
    private int createdUsers = 0;
    private int failedRows = 0;
    private int importedRows = 0;
    private final List<ImportFailureDto> failures = new ArrayList<>();
    private final int totalRows;
    private int updatedBindings = 0;
    private int updatedUsers = 0;

    private ImportMemberAccumulator(int totalRows) {
      this.totalRows = totalRows;
    }

    private List<ImportFailureDto> failures() {
      return failures;
    }

    private MemberImportResultDto toDto() {
      return new MemberImportResultDto(
        createdBindings,
        createdUsers,
        failedRows,
        List.copyOf(failures),
        importedRows,
        totalRows,
        updatedBindings,
        updatedUsers
      );
    }
  }
}
