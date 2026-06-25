package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.FranchiseeItemDto;
import cn.hentor.vegetables.dto.FranchiseeListResponse;
import cn.hentor.vegetables.dto.FranchiseeRequest;
import cn.hentor.vegetables.dto.FranchiseeResponse;
import cn.hentor.vegetables.dto.FranchiseeStoreDto;
import cn.hentor.vegetables.dto.FranchiseeSummaryDto;
import cn.hentor.vegetables.dto.PaginationDto;
import cn.hentor.vegetables.dto.StoreManagementFranchiseeDto;
import cn.hentor.vegetables.dto.StoreManagementItemDto;
import cn.hentor.vegetables.dto.StoreManagementListResponse;
import cn.hentor.vegetables.dto.StoreManagementRequest;
import cn.hentor.vegetables.dto.StoreManagementResponse;
import cn.hentor.vegetables.dto.StoreManagementSummaryDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.AdminUserStoreEntity;
import cn.hentor.vegetables.entity.FranchiseeEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.PackageTemplateEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.AdminUserStoreMapper;
import cn.hentor.vegetables.mapper.FranchiseeMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.PackageTemplateMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class StoreManagementService {
  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final AdminUserStoreMapper adminUserStoreMapper;
  private final FranchiseeMapper franchiseeMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final ObjectMapper objectMapper;
  private final OrderMapper orderMapper;
  private final PackageTemplateMapper packageTemplateMapper;
  private final StoreMapper storeMapper;

  public StoreManagementService(
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    AdminUserStoreMapper adminUserStoreMapper,
    FranchiseeMapper franchiseeMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    ObjectMapper objectMapper,
    OrderMapper orderMapper,
    PackageTemplateMapper packageTemplateMapper,
    StoreMapper storeMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.adminUserStoreMapper = adminUserStoreMapper;
    this.franchiseeMapper = franchiseeMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.objectMapper = objectMapper;
    this.orderMapper = orderMapper;
    this.packageTemplateMapper = packageTemplateMapper;
    this.storeMapper = storeMapper;
  }

  public StoreManagementListResponse listStores(
    AdminSessionDto session,
    String query,
    String status,
    String type,
    long page,
    long pageSize
  ) {
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    LambdaQueryWrapper<StoreEntity> wrapper = buildStoreWrapper(query, status, type);
    if (!"ALL".equals(session.storeScope())) {
      List<String> storeIds = session.stores().stream().map(store -> store.id()).toList();
      if (storeIds.isEmpty()) {
        return new StoreManagementListResponse(
          List.of(),
          new PaginationDto(normalizedPage, normalizedPageSize, 0, 0),
          new StoreManagementSummaryDto(0, 0, 0, 0, 0)
        );
      }
      wrapper.in(StoreEntity::getId, storeIds);
    }
    wrapper.orderByDesc(StoreEntity::getCreatedAt);

    Page<StoreEntity> result = storeMapper.selectPage(
      Page.of(normalizedPage, normalizedPageSize),
      wrapper
    );
    StoreManagementSummaryDto summary = storeSummary(query, status, type, session);
    return new StoreManagementListResponse(
      result.getRecords().stream().map(this::toStoreItem).toList(),
      new PaginationDto(normalizedPage, normalizedPageSize, result.getTotal(), totalPages(result.getTotal(), normalizedPageSize)),
      summary
    );
  }

  public StoreManagementResponse getStore(String storeId) {
    StoreEntity store = requireStore(storeId);
    return new StoreManagementResponse(toStoreItem(store));
  }

  @Transactional
  public StoreManagementResponse createStore(AdminSessionDto session, StoreManagementRequest request) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity store = normalizeStoreRequest(new StoreEntity(), request);
    store.setId(id());
    store.setCreatedAt(LocalDateTime.now());
    store.setUpdatedAt(store.getCreatedAt());
    ensureFranchisee(store.getFranchiseeId());
    ensureStoreCodeAvailable(store.getCode(), null);
    storeMapper.insertAdminStore(store);
    StoreManagementItemDto created = toStoreItem(storeMapper.selectById(store.getId()));
    writeOperationLog(
      operator.getId(),
      store.getId(),
      "STORE_CREATED",
      "store",
      store.getId(),
      null,
      storeLogValue(created)
    );
    return new StoreManagementResponse(created);
  }

  @Transactional
  public StoreManagementResponse updateStore(
    AdminSessionDto session,
    String storeId,
    StoreManagementRequest request
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity before = requireStore(storeId);
    StoreManagementItemDto beforeItem = toStoreItem(before);
    StoreEntity update = normalizeStoreRequest(new StoreEntity(), request);
    update.setId(storeId);
    update.setCreatedAt(before.getCreatedAt());
    update.setUpdatedAt(LocalDateTime.now());
    ensureFranchisee(update.getFranchiseeId());
    ensureStoreCodeAvailable(update.getCode(), storeId);
    storeMapper.updateAdminStore(update);
    StoreManagementItemDto after = toStoreItem(requireStore(storeId));
    writeOperationLog(
      operator.getId(),
      storeId,
      "STORE_UPDATED",
      "store",
      storeId,
      storeLogValue(beforeItem),
      storeLogValue(after)
    );
    return new StoreManagementResponse(after);
  }

  public FranchiseeListResponse listFranchisees(
    String query,
    String status,
    long page,
    long pageSize
  ) {
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    LambdaQueryWrapper<FranchiseeEntity> wrapper = buildFranchiseeWrapper(query, status)
      .orderByDesc(FranchiseeEntity::getCreatedAt);
    Page<FranchiseeEntity> result = franchiseeMapper.selectPage(
      Page.of(normalizedPage, normalizedPageSize),
      wrapper
    );
    FranchiseeSummaryDto summary = franchiseeSummary(query, status);
    return new FranchiseeListResponse(
      result.getRecords().stream().map(franchisee -> toFranchiseeItem(franchisee, false)).toList(),
      new PaginationDto(normalizedPage, normalizedPageSize, result.getTotal(), totalPages(result.getTotal(), normalizedPageSize)),
      summary
    );
  }

  public FranchiseeResponse getFranchisee(String franchiseeId) {
    FranchiseeEntity franchisee = requireFranchisee(franchiseeId);
    return new FranchiseeResponse(toFranchiseeItem(franchisee, true));
  }

  @Transactional
  public FranchiseeResponse createFranchisee(AdminSessionDto session, FranchiseeRequest request) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    FranchiseeEntity franchisee = normalizeFranchiseeRequest(new FranchiseeEntity(), request);
    franchisee.setId(id());
    franchisee.setCreatedAt(LocalDateTime.now());
    franchisee.setUpdatedAt(franchisee.getCreatedAt());
    franchiseeMapper.insertAdminFranchisee(franchisee);
    FranchiseeItemDto created = toFranchiseeItem(franchiseeMapper.selectById(franchisee.getId()), true);
    writeOperationLog(
      operator.getId(),
      null,
      "FRANCHISEE_CREATED",
      "franchisee",
      franchisee.getId(),
      null,
      franchiseeLogValue(created)
    );
    return new FranchiseeResponse(created);
  }

  @Transactional
  public FranchiseeResponse updateFranchisee(
    AdminSessionDto session,
    String franchiseeId,
    FranchiseeRequest request
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    FranchiseeEntity before = requireFranchisee(franchiseeId);
    FranchiseeItemDto beforeItem = toFranchiseeItem(before, true);
    FranchiseeEntity update = normalizeFranchiseeRequest(new FranchiseeEntity(), request);
    update.setId(franchiseeId);
    update.setCreatedAt(before.getCreatedAt());
    update.setUpdatedAt(LocalDateTime.now());
    franchiseeMapper.updateAdminFranchisee(update);
    FranchiseeItemDto after = toFranchiseeItem(requireFranchisee(franchiseeId), true);
    writeOperationLog(
      operator.getId(),
      null,
      "FRANCHISEE_UPDATED",
      "franchisee",
      franchiseeId,
      franchiseeLogValue(beforeItem),
      franchiseeLogValue(after)
    );
    return new FranchiseeResponse(after);
  }

  private LambdaQueryWrapper<StoreEntity> buildStoreWrapper(String query, String status, String type) {
    LambdaQueryWrapper<StoreEntity> wrapper = new LambdaQueryWrapper<>();
    String normalizedStatus = normalizeOptionalText(status);
    String normalizedType = normalizeOptionalText(type);
    if (StringUtils.hasText(normalizedStatus)) {
      if (!List.of("ACTIVE", "DISABLED").contains(normalizedStatus)) {
        throw new ApiException("INVALID_PARAMS", "门店查询参数不正确", HttpStatus.BAD_REQUEST);
      }
      wrapper.apply("\"status\" = {0}", normalizedStatus);
    }
    if (StringUtils.hasText(normalizedType)) {
      if (!List.of("DIRECT", "FRANCHISE").contains(normalizedType)) {
        throw new ApiException("INVALID_PARAMS", "门店查询参数不正确", HttpStatus.BAD_REQUEST);
      }
      wrapper.apply("\"type\" = {0}", normalizedType);
    }
    String keyword = normalizeOptionalText(query);
    if (StringUtils.hasText(keyword)) {
      String like = "%" + keyword.toLowerCase() + "%";
      wrapper.and(inner -> inner
        .apply("LOWER(\"code\") LIKE {0}", like)
        .or()
        .apply("LOWER(\"name\") LIKE {0}", like)
        .or()
        .apply("LOWER(\"contactName\") LIKE {0}", like)
        .or()
        .apply("LOWER(\"contactPhone\") LIKE {0}", like)
      );
    }
    return wrapper;
  }

  private LambdaQueryWrapper<FranchiseeEntity> buildFranchiseeWrapper(String query, String status) {
    LambdaQueryWrapper<FranchiseeEntity> wrapper = new LambdaQueryWrapper<>();
    String normalizedStatus = normalizeOptionalText(status);
    if (StringUtils.hasText(normalizedStatus)) {
      if (!List.of("ACTIVE", "SUSPENDED", "EXPIRED").contains(normalizedStatus)) {
        throw new ApiException("INVALID_PARAMS", "加盟商查询参数不正确", HttpStatus.BAD_REQUEST);
      }
      wrapper.apply("\"status\" = {0}", normalizedStatus);
    }
    String keyword = normalizeOptionalText(query);
    if (StringUtils.hasText(keyword)) {
      String like = "%" + keyword.toLowerCase() + "%";
      wrapper.and(inner -> inner
        .apply("LOWER(\"name\") LIKE {0}", like)
        .or()
        .apply("LOWER(\"contactName\") LIKE {0}", like)
        .or()
        .apply("LOWER(\"contactPhone\") LIKE {0}", like)
      );
    }
    return wrapper;
  }

  private StoreManagementSummaryDto storeSummary(
    String query,
    String status,
    String type,
    AdminSessionDto session
  ) {
    LambdaQueryWrapper<StoreEntity> base = buildStoreWrapper(query, status, type);
    if (!"ALL".equals(session.storeScope())) {
      List<String> storeIds = session.stores().stream().map(store -> store.id()).toList();
      if (storeIds.isEmpty()) {
        return new StoreManagementSummaryDto(0, 0, 0, 0, 0);
      }
      base.in(StoreEntity::getId, storeIds);
    }
    List<StoreEntity> stores = storeMapper.selectList(base);
    long active = stores.stream().filter(store -> "ACTIVE".equals(store.getStatus())).count();
    long disabled = stores.stream().filter(store -> "DISABLED".equals(store.getStatus())).count();
    long direct = stores.stream().filter(store -> "DIRECT".equals(store.getType())).count();
    long franchise = stores.stream().filter(store -> "FRANCHISE".equals(store.getType())).count();
    return new StoreManagementSummaryDto(active, direct, disabled, franchise, stores.size());
  }

  private FranchiseeSummaryDto franchiseeSummary(String query, String status) {
    List<FranchiseeEntity> franchisees = franchiseeMapper.selectList(buildFranchiseeWrapper(query, status));
    long active = franchisees.stream().filter(franchisee -> "ACTIVE".equals(franchisee.getStatus())).count();
    long expired = franchisees.stream().filter(franchisee -> "EXPIRED".equals(franchisee.getStatus())).count();
    long suspended = franchisees.stream().filter(franchisee -> "SUSPENDED".equals(franchisee.getStatus())).count();
    return new FranchiseeSummaryDto(active, expired, suspended, franchisees.size());
  }

  private StoreManagementItemDto toStoreItem(StoreEntity store) {
    FranchiseeEntity franchisee = StringUtils.hasText(store.getFranchiseeId())
      ? franchiseeMapper.selectById(store.getFranchiseeId())
      : null;
    long adminUserCount = adminUserStoreMapper.selectCount(
      new LambdaQueryWrapper<AdminUserStoreEntity>().eq(AdminUserStoreEntity::getStoreId, store.getId())
    );
    long memberCount = memberStoreBindingMapper.selectCount(
      new LambdaQueryWrapper<MemberStoreBindingEntity>().eq(MemberStoreBindingEntity::getStoreId, store.getId())
    );
    long orderCount = orderMapper.selectCount(
      new LambdaQueryWrapper<OrderEntity>().eq(OrderEntity::getStoreId, store.getId())
    );
    long packageTemplateCount = packageTemplateMapper.selectCount(
      new LambdaQueryWrapper<PackageTemplateEntity>().eq(PackageTemplateEntity::getStoreId, store.getId())
    );
    String address = joinAddress(store.getProvince(), store.getCity(), store.getDistrict(), store.getAddress());
    return new StoreManagementItemDto(
      address,
      store.getAddress(),
      adminUserCount,
      store.getCity(),
      store.getCode(),
      store.getContactName(),
      store.getContactPhone(),
      store.getCreatedAt(),
      store.getCustomerServiceTel(),
      store.getCutoffTime(),
      readJsonStringArray(store.getDeliveryCities()),
      readJsonStringArray(store.getDeliveryProvinces()),
      store.getDistrict(),
      store.getFranchiseEndsAt(),
      franchisee == null ? null : new StoreManagementFranchiseeDto(
        franchisee.getContactName(),
        franchisee.getContactPhone(),
        franchisee.getId(),
        franchisee.getName(),
        franchisee.getStatus()
      ),
      store.getFranchiseeId(),
      franchisee == null ? "总部直营" : franchisee.getName(),
      store.getId(),
      memberCount,
      store.getName(),
      true,
      orderCount,
      packageTemplateCount,
      store.getProvince(),
      store.getStatus(),
      store.getType(),
      store.getUpdatedAt()
    );
  }

  private FranchiseeItemDto toFranchiseeItem(FranchiseeEntity franchisee, boolean includeStores) {
    List<StoreEntity> stores = storeMapper.selectList(
      new LambdaQueryWrapper<StoreEntity>()
        .eq(StoreEntity::getFranchiseeId, franchisee.getId())
        .orderByAsc(StoreEntity::getStatus)
        .orderByDesc(StoreEntity::getCreatedAt)
    );
    List<FranchiseeStoreDto> storeDtos = includeStores
      ? stores.stream().map(store -> new FranchiseeStoreDto(
        store.getCode(),
        store.getContactName(),
        store.getContactPhone(),
        store.getId(),
        store.getName(),
        store.getStatus(),
        store.getType()
      )).toList()
      : List.of();
    return new FranchiseeItemDto(
      franchisee.getContactName(),
      franchisee.getContactPhone(),
      franchisee.getContractEndsAt(),
      franchisee.getCreatedAt(),
      franchisee.getId(),
      franchisee.getName(),
      franchisee.getRemark(),
      franchisee.getStatus(),
      stores.size(),
      storeDtos,
      franchisee.getUpdatedAt()
    );
  }

  private StoreEntity normalizeStoreRequest(StoreEntity store, StoreManagementRequest request) {
    String type = normalizeRequiredText(request.type(), "TYPE_REQUIRED", "请选择门店类型");
    String franchiseeId = "FRANCHISE".equals(type) ? normalizeOptionalText(request.franchiseeId()) : null;
    if ("FRANCHISE".equals(type) && !StringUtils.hasText(franchiseeId)) {
      throw new ApiException("FRANCHISEE_REQUIRED", "加盟门店必须选择加盟商", HttpStatus.BAD_REQUEST);
    }
    store.setAddress(normalizeOptionalText(request.address()));
    store.setCity(normalizeOptionalText(request.city()));
    store.setCode(normalizeRequiredText(request.code(), "CODE_REQUIRED", "请输入门店编码"));
    store.setContactName(normalizeRequiredText(request.contactName(), "CONTACT_NAME_REQUIRED", "请输入店长姓名"));
    store.setContactPhone(normalizeRequiredText(request.contactPhone(), "CONTACT_PHONE_REQUIRED", "请输入门店电话"));
    store.setCustomerServiceTel(normalizeOptionalText(request.customerServiceTel()));
    store.setCutoffTime(normalizeRequiredText(request.cutoffTime(), "CUTOFF_TIME_REQUIRED", "请输入截单时间"));
    store.setDeliveryCities(toJson(normalizeDeliveryRangeValues(request.deliveryCities())));
    store.setDeliveryProvinces(toJson(normalizeDeliveryRangeValues(request.deliveryProvinces())));
    store.setDistrict(normalizeOptionalText(request.district()));
    store.setFranchiseEndsAt(request.franchiseEndsAt());
    store.setFranchiseeId(franchiseeId);
    store.setName(normalizeRequiredText(request.name(), "NAME_REQUIRED", "请输入门店名称"));
    store.setProvince(normalizeOptionalText(request.province()));
    store.setStatus(normalizeRequiredText(request.status(), "STATUS_REQUIRED", "请选择门店状态"));
    store.setType(type);
    return store;
  }

  private FranchiseeEntity normalizeFranchiseeRequest(FranchiseeEntity franchisee, FranchiseeRequest request) {
    franchisee.setContactName(normalizeRequiredText(request.contactName(), "CONTACT_NAME_REQUIRED", "请输入联系人"));
    franchisee.setContactPhone(normalizeRequiredText(request.contactPhone(), "CONTACT_PHONE_REQUIRED", "请输入联系电话"));
    franchisee.setContractEndsAt(request.contractEndsAt());
    franchisee.setName(normalizeRequiredText(request.name(), "NAME_REQUIRED", "请输入加盟商名称"));
    franchisee.setRemark(normalizeOptionalText(request.remark()));
    franchisee.setStatus(normalizeRequiredText(request.status(), "STATUS_REQUIRED", "请选择加盟商状态"));
    return franchisee;
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private StoreEntity requireStore(String storeId) {
    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }
    return store;
  }

  private FranchiseeEntity requireFranchisee(String franchiseeId) {
    FranchiseeEntity franchisee = franchiseeMapper.selectById(franchiseeId);
    if (franchisee == null) {
      throw new ApiException("FRANCHISEE_NOT_FOUND", "加盟商不存在", HttpStatus.NOT_FOUND);
    }
    return franchisee;
  }

  private void ensureFranchisee(String franchiseeId) {
    if (!StringUtils.hasText(franchiseeId)) {
      return;
    }
    requireFranchisee(franchiseeId);
  }

  private void ensureStoreCodeAvailable(String code, String currentStoreId) {
    StoreEntity existing = storeMapper.selectOne(
      new LambdaQueryWrapper<StoreEntity>().eq(StoreEntity::getCode, code)
    );
    if (existing != null && !existing.getId().equals(currentStoreId)) {
      throw new ApiException("STORE_CODE_EXISTS", "门店编码已存在", HttpStatus.CONFLICT);
    }
  }

  private List<String> normalizeDeliveryRangeValues(List<String> values) {
    Set<String> seen = new LinkedHashSet<>();
    for (String value : values == null ? List.<String>of() : values) {
      String normalized = normalizeOptionalText(value);
      if (StringUtils.hasText(normalized)) {
        seen.add(normalized);
      }
    }
    return List.copyOf(seen);
  }

  private List<String> readJsonStringArray(String value) {
    if (!StringUtils.hasText(value)) {
      return List.of();
    }
    try {
      JsonNode node = objectMapper.readTree(value);
      if (!node.isArray()) {
        return List.of();
      }
      Set<String> values = new LinkedHashSet<>();
      node.forEach(item -> {
        if (item.isTextual() && StringUtils.hasText(item.asText())) {
          values.add(item.asText().trim());
        }
      });
      return List.copyOf(values);
    } catch (JsonProcessingException exception) {
      return List.of();
    }
  }

  private String normalizeOptionalText(String value) {
    String normalized = value == null ? "" : value.trim();
    return StringUtils.hasText(normalized) ? normalized : null;
  }

  private String normalizeRequiredText(String value, String code, String message) {
    String normalized = normalizeOptionalText(value);
    if (!StringUtils.hasText(normalized)) {
      throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private String joinAddress(String... parts) {
    return java.util.Arrays.stream(parts)
      .filter(StringUtils::hasText)
      .collect(java.util.stream.Collectors.joining(" "));
  }

  private Map<String, Object> storeLogValue(StoreManagementItemDto item) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("address", item.addressDetail());
    value.put("city", item.city());
    value.put("code", item.code());
    value.put("contactName", item.contactName());
    value.put("contactPhone", item.contactPhone());
    value.put("customerServiceTel", item.customerServiceTel());
    value.put("cutoffTime", item.cutoffTime());
    value.put("deliveryCities", item.deliveryCities());
    value.put("deliveryProvinces", item.deliveryProvinces());
    value.put("district", item.district());
    value.put("franchiseEndsAt", item.franchiseEndsAt());
    value.put("franchiseeId", item.franchiseeId());
    value.put("name", item.name());
    value.put("province", item.province());
    value.put("status", item.status());
    value.put("type", item.type());
    return value;
  }

  private Map<String, Object> franchiseeLogValue(FranchiseeItemDto item) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("contactName", item.contactName());
    value.put("contactPhone", item.contactPhone());
    value.put("contractEndsAt", item.contractEndsAt());
    value.put("name", item.name());
    value.put("remark", item.remark());
    value.put("status", item.status());
    return value;
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String action,
    String resource,
    String resourceId,
    Object beforeValue,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource(resource);
    log.setResourceId(resourceId);
    log.setAction(action);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams(toJson(afterValue));
    log.setResponseData("{}");
    log.setStatusCode(200);
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

  private long totalPages(long total, long pageSize) {
    return pageSize <= 0 ? 0 : (long) Math.ceil((double) total / pageSize);
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }
}
