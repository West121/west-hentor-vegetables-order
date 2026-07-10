package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.DishDetailDto;
import cn.hentor.vegetables.dto.DishDetailResponse;
import cn.hentor.vegetables.dto.DishDto;
import cn.hentor.vegetables.dto.DishImportResultDto;
import cn.hentor.vegetables.dto.DishImportRow;
import cn.hentor.vegetables.dto.DishInventoryLogDto;
import cn.hentor.vegetables.dto.DishInventoryRequest;
import cn.hentor.vegetables.dto.DishListResponse;
import cn.hentor.vegetables.dto.DishPaginationDto;
import cn.hentor.vegetables.dto.DishRequest;
import cn.hentor.vegetables.dto.DishResponse;
import cn.hentor.vegetables.dto.DishSummaryDto;
import cn.hentor.vegetables.dto.ImportFailureDto;
import cn.hentor.vegetables.dto.SystemDictionaryItemDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.DishEntity;
import cn.hentor.vegetables.entity.InventoryLogEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.DishMapper;
import cn.hentor.vegetables.mapper.InventoryLogMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class DishService {
  private static final Set<String> STATUSES = Set.of("ON_SALE", "OFF_SALE");

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final DishMapper dishMapper;
  private final InventoryLogMapper inventoryLogMapper;
  private final ObjectMapper objectMapper;
  private final StoreMapper storeMapper;
  private final SystemDictionaryService systemDictionaryService;

  public DishService(
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    DishMapper dishMapper,
    InventoryLogMapper inventoryLogMapper,
    ObjectMapper objectMapper,
    StoreMapper storeMapper,
    SystemDictionaryService systemDictionaryService
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.dishMapper = dishMapper;
    this.inventoryLogMapper = inventoryLogMapper;
    this.objectMapper = objectMapper;
    this.storeMapper = storeMapper;
    this.systemDictionaryService = systemDictionaryService;
  }

  public DishListResponse list(
    String storeId,
    String category,
    String status,
    String query,
    long page,
    long pageSize
  ) {
    validateStore(storeId);
    validateOptionalCategory(storeId, category);
    validateOptionalStatus(status);

    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    LambdaQueryWrapper<DishEntity> wrapper = buildListWrapper(storeId, category, status, query)
      .orderByDesc(DishEntity::getCreatedAt)
      .orderByDesc(DishEntity::getId);
    Page<DishEntity> result = dishMapper.selectPage(
      new Page<>(normalizedPage, normalizedPageSize),
      wrapper
    );

    long totalPages =
      result.getSize() == 0 ? 0 : (long) Math.ceil((double) result.getTotal() / result.getSize());
    return new DishListResponse(
      result.getRecords().stream().map(this::toDto).toList(),
      new DishPaginationDto(
        result.getCurrent(),
        result.getSize(),
        result.getTotal(),
        totalPages
      ),
      summary(storeId)
    );
  }

  public DishDetailResponse get(String storeId, String dishId) {
    DishEntity dish = requireDish(storeId, dishId);
    return new DishDetailResponse(toDetailDto(dish));
  }

  @Transactional
  public DishResponse create(DishRequest request, AdminSessionDto session) {
    requireActiveOperator(session.adminUserId());
    validateStore(request.storeId());
    NormalizedDishInput input = normalizeCreateInput(request);
    LocalDateTime now = LocalDateTime.now();
    DishEntity dish = new DishEntity();
    dish.setId(id());
    dish.setStoreId(request.storeId());
    dish.setName(input.name());
    dish.setCategory(input.category());
    dish.setStatus(input.status());
    dish.setStepJin(input.stepJin());
    dish.setStockJin(input.stockJin());
    dish.setImageKey(input.imageKey());
    dish.setImageUrl(input.imageUrl());
    dish.setDescription(input.description());
    dish.setSortOrder(input.sortOrder());
    dish.setCreatedAt(now);
    dish.setUpdatedAt(now);
    dishMapper.insertAdminDish(dish);

    writeOperationLog(
      session.adminUserId(),
      request.storeId(),
      dish.getId(),
      "DISH_CREATED",
      null,
      dishLogValue(dish)
    );

    return new DishResponse(toDto(dish));
  }

  @Transactional
  public DishResponse update(String dishId, DishRequest request, AdminSessionDto session) {
    requireActiveOperator(session.adminUserId());
    DishEntity existing = requireDish(request.storeId(), dishId);
    NormalizedDishInput input = normalizeUpdateInput(request, existing);
    DishEntity update = new DishEntity();
    update.setId(existing.getId());
    update.setStoreId(existing.getStoreId());
    update.setName(input.name());
    update.setCategory(input.category());
    update.setStatus(input.status());
    update.setStepJin(input.stepJin());
    update.setStockJin(existing.getStockJin());
    update.setImageKey(input.imageKey());
    update.setImageUrl(input.imageUrl());
    update.setDescription(input.description());
    update.setSortOrder(input.sortOrder());
    update.setCreatedAt(existing.getCreatedAt());
    update.setUpdatedAt(LocalDateTime.now());
    dishMapper.updateAdminDish(update);

    DishEntity updated = requireDish(request.storeId(), dishId);
    writeOperationLog(
      session.adminUserId(),
      request.storeId(),
      existing.getId(),
      "DISH_UPDATED",
      dishLogValue(existing),
      dishLogValue(updated)
    );

    return new DishResponse(toDto(updated));
  }

  @Transactional
  public DishResponse adjustInventory(
    String dishId,
    DishInventoryRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    DishEntity dish = requireDish(request.storeId(), dishId);
    BigDecimal changeJin = request.changeJin();
    if (changeJin == null || changeJin.compareTo(BigDecimal.ZERO) == 0) {
      throw new ApiException("CHANGE_JIN_INVALID", "库存调整斤数不正确", HttpStatus.BAD_REQUEST);
    }
    String reason = request.reason() == null ? "" : request.reason().trim();
    if (!StringUtils.hasText(reason)) {
      throw new ApiException("REASON_REQUIRED", "请输入操作原因", HttpStatus.BAD_REQUEST);
    }

    BigDecimal before = dish.getStockJin();
    BigDecimal after = before.add(changeJin).setScale(2, RoundingMode.HALF_UP);
    if (after.compareTo(BigDecimal.ZERO) < 0) {
      throw new ApiException("STOCK_NOT_ENOUGH", "库存不能调整为负数", HttpStatus.BAD_REQUEST);
    }

    DishEntity update = new DishEntity();
    update.setId(dish.getId());
    update.setStockJin(after);
    update.setStatus(after.compareTo(BigDecimal.ZERO) <= 0 ? "OFF_SALE" : dish.getStatus());
    update.setUpdatedAt(LocalDateTime.now());
    dishMapper.updateInventoryAndStatus(update);

    InventoryLogEntity log = new InventoryLogEntity();
    log.setId(id());
    log.setStoreId(request.storeId());
    log.setDishId(dish.getId());
    log.setBeforeJin(before);
    log.setChangeJin(changeJin);
    log.setAfterJin(after);
    log.setReason(reason);
    log.setOperatorId(operator.getId());
    log.setCreatedAt(LocalDateTime.now());
    inventoryLogMapper.insert(log);

    return new DishResponse(toDto(requireDish(request.storeId(), dishId)));
  }

  @Transactional
  public DishImportResultDto importDishes(
    String storeId,
    List<DishImportRow> rows,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    validateStore(storeId);

    ImportDishAccumulator result = new ImportDishAccumulator(rows.size());
    for (DishImportRow row : rows) {
      try {
        String name = row.name() == null ? "" : row.name().trim();
        if (!StringUtils.hasText(name)) {
          result.failures().add(importFailure(row, "菜品名称不能为空"));
          continue;
        }

        String category = resolveImportCategory(storeId, row.category());
        if (!StringUtils.hasText(category)) {
          result.failures().add(importFailure(row, "菜品分类不正确，请填写系统字典中的分类名称或编码"));
          continue;
        }

        DishEntity existing = findDishByName(storeId, name);
        BigDecimal effectiveStock = existing == null ? row.stockJin() : existing.getStockJin();
        DishRequest request = new DishRequest(
          storeId,
          name,
          category,
          row.status() == null ? (existing == null ? "ON_SALE" : existing.getStatus()) : row.status(),
          row.stepJin(),
          effectiveStock,
          existing == null ? null : existing.getImageKey(),
          existing == null ? null : existing.getImageUrl(),
          row.description(),
          row.sortOrder()
        );

        if (existing == null) {
          create(request, session);
          result.createdDishes += 1;
        } else {
          update(existing.getId(), request, session);
          result.updatedDishes += 1;
        }
        result.importedRows += 1;
      } catch (ApiException exception) {
        result.failures().add(importFailure(row, exception.getMessage()));
      } catch (RuntimeException exception) {
        result.failures().add(importFailure(row, "导入失败，请检查该行数据"));
      }
    }

    result.failedRows = result.failures().size();
    DishImportResultDto response = result.toDto();
    writeOperationLog(
      operator.getId(),
      storeId,
      "import",
      "DISH_IMPORT",
      null,
      Map.of(
        "createdDishes", response.createdDishes(),
        "failedRows", response.failedRows(),
        "failureSamples", response.failures().stream().limit(20).toList(),
        "importedRows", response.importedRows(),
        "totalRows", response.totalRows(),
        "updatedDishes", response.updatedDishes()
      )
    );
    return response;
  }

  private LambdaQueryWrapper<DishEntity> buildListWrapper(
    String storeId,
    String category,
    String status,
    String query
  ) {
    LambdaQueryWrapper<DishEntity> wrapper = new LambdaQueryWrapper<DishEntity>()
      .eq(DishEntity::getStoreId, storeId)
      .isNull(DishEntity::getDeletedAt);
    if (StringUtils.hasText(category)) {
      wrapper.apply("\"category\" = {0}", category);
    }
    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      wrapper.apply("\"status\" = {0}", status);
    }
    if (StringUtils.hasText(query)) {
      String keyword = query.trim();
      wrapper.and(w -> w
        .like(DishEntity::getName, keyword)
        .or()
        .like(DishEntity::getDescription, keyword)
      );
    }
    return wrapper;
  }

  private DishSummaryDto summary(String storeId) {
    long total = dishMapper.selectCount(
      new LambdaQueryWrapper<DishEntity>()
        .eq(DishEntity::getStoreId, storeId)
        .isNull(DishEntity::getDeletedAt)
    );
    long onSale = dishMapper.selectCount(
      new LambdaQueryWrapper<DishEntity>()
        .eq(DishEntity::getStoreId, storeId)
        .isNull(DishEntity::getDeletedAt)
        .apply("\"status\" = 'ON_SALE'")
    );
    long offSale = dishMapper.selectCount(
      new LambdaQueryWrapper<DishEntity>()
        .eq(DishEntity::getStoreId, storeId)
        .isNull(DishEntity::getDeletedAt)
        .apply("\"status\" = 'OFF_SALE'")
    );
    long lowStock = dishMapper.selectCount(
      new LambdaQueryWrapper<DishEntity>()
        .eq(DishEntity::getStoreId, storeId)
        .isNull(DishEntity::getDeletedAt)
        .le(DishEntity::getStockJin, new BigDecimal("5"))
    );
    return new DishSummaryDto(
      lowStock,
      offSale,
      onSale,
      dishMapper.sumStockByStore(storeId),
      total
    );
  }

  private DishDetailDto toDetailDto(DishEntity dish) {
    List<InventoryLogEntity> logs = inventoryLogMapper.selectList(
      new LambdaQueryWrapper<InventoryLogEntity>()
        .eq(InventoryLogEntity::getDishId, dish.getId())
        .orderByDesc(InventoryLogEntity::getCreatedAt)
        .last("LIMIT 20")
    );
    List<String> operatorIds = logs
      .stream()
      .map(InventoryLogEntity::getOperatorId)
      .filter(StringUtils::hasText)
      .distinct()
      .toList();
    Map<String, AdminUserEntity> operators = operatorIds.isEmpty()
      ? Map.of()
      : adminUserMapper
        .selectBatchIds(operatorIds)
        .stream()
        .collect(Collectors.toMap(AdminUserEntity::getId, Function.identity()));

    return new DishDetailDto(
      dish.getId(),
      dish.getName(),
      dish.getCategory(),
      dish.getStatus(),
      dish.getStepJin(),
      dish.getStockJin(),
      dish.getImageKey(),
      dish.getImageUrl(),
      dish.getDescription(),
      dish.getSortOrder(),
      dish.getCreatedAt(),
      dish.getUpdatedAt(),
      dish.getDeletedAt(),
      logs.stream().map(log -> {
        AdminUserEntity operator = operators.get(log.getOperatorId());
        return new DishInventoryLogDto(
          log.getId(),
          log.getBeforeJin(),
          log.getChangeJin(),
          log.getAfterJin(),
          log.getReason(),
          log.getOperatorId(),
          operator == null ? null : operator.getName(),
          operator == null ? null : operator.getUsername(),
          log.getCreatedAt()
        );
      }).toList()
    );
  }

  private NormalizedDishInput normalizeCreateInput(DishRequest request) {
    return normalizeInput(request, request.stockJin() == null ? BigDecimal.ZERO : request.stockJin());
  }

  private NormalizedDishInput normalizeUpdateInput(DishRequest request, DishEntity existing) {
    return normalizeInput(request, existing.getStockJin());
  }

  private NormalizedDishInput normalizeInput(DishRequest request, BigDecimal effectiveStockJin) {
    String name = request.name() == null ? "" : request.name().trim();
    if (!StringUtils.hasText(name)) {
      throw new ApiException("NAME_REQUIRED", "请输入菜品名称", HttpStatus.BAD_REQUEST);
    }
    if (!StringUtils.hasText(request.category())) {
      throw new ApiException("CATEGORY_INVALID", "菜品分类不正确", HttpStatus.BAD_REQUEST);
    }
    validateOptionalCategory(request.storeId(), request.category());
    validateOptionalStatus(request.status());
    if (request.stepJin() == null || request.stepJin().compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException("STEP_JIN_INVALID", "起订步进不正确", HttpStatus.BAD_REQUEST);
    }
    if (effectiveStockJin == null || effectiveStockJin.compareTo(BigDecimal.ZERO) < 0) {
      throw new ApiException("STOCK_JIN_INVALID", "库存斤数不正确", HttpStatus.BAD_REQUEST);
    }
    Integer sortOrder = request.sortOrder() == null ? 0 : request.sortOrder();
    String status = StringUtils.hasText(request.status()) ? request.status() : "ON_SALE";

    return new NormalizedDishInput(
      name,
      request.category(),
      status,
      request.stepJin().setScale(2, RoundingMode.HALF_UP),
      request.stockJin() == null ? BigDecimal.ZERO : request.stockJin().setScale(2, RoundingMode.HALF_UP),
      nullableText(request.imageKey()),
      nullableText(request.imageUrl()),
      nullableText(request.description()),
      sortOrder
    );
  }

  private void validateStore(String storeId) {
    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }
  }

  private void validateOptionalCategory(String storeId, String category) {
    if (
      StringUtils.hasText(category) &&
      !systemDictionaryService
        .enabledCodes(storeId, SystemDictionaryService.DISH_CATEGORY_TYPE)
        .contains(category.trim().toUpperCase())
    ) {
      throw new ApiException("CATEGORY_INVALID", "菜品分类不正确", HttpStatus.BAD_REQUEST);
    }
  }

  private String resolveImportCategory(String storeId, String category) {
    String value = category == null ? "" : category.trim();
    if (!StringUtils.hasText(value)) {
      return null;
    }
    String normalizedCode = value.toUpperCase();
    List<SystemDictionaryItemDto> items = systemDictionaryService
      .getDictionary(storeId, SystemDictionaryService.DISH_CATEGORY_TYPE)
      .items();
    for (SystemDictionaryItemDto item : items) {
      if (Boolean.FALSE.equals(item.enabled())) {
        continue;
      }
      if (normalizedCode.equalsIgnoreCase(item.code()) || value.equals(item.name())) {
        return item.code();
      }
    }
    return normalizedCode;
  }

  private DishEntity findDishByName(String storeId, String name) {
    return dishMapper.selectOne(
      new LambdaQueryWrapper<DishEntity>()
        .eq(DishEntity::getStoreId, storeId)
        .eq(DishEntity::getName, name)
        .isNull(DishEntity::getDeletedAt)
        .last("LIMIT 1")
    );
  }

  private ImportFailureDto importFailure(DishImportRow row, String reason) {
    return new ImportFailureDto(row.name(), reason, row.rowNumber(), row.category());
  }

  private void validateOptionalStatus(String status) {
    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status) && !STATUSES.contains(status)) {
      throw new ApiException("STATUS_INVALID", "菜品状态不正确", HttpStatus.BAD_REQUEST);
    }
  }

  private DishEntity requireDish(String storeId, String dishId) {
    DishEntity dish = dishMapper.selectOne(
      new LambdaQueryWrapper<DishEntity>()
        .eq(DishEntity::getStoreId, storeId)
        .eq(DishEntity::getId, dishId)
        .isNull(DishEntity::getDeletedAt)
    );
    if (dish == null) {
      throw new ApiException("DISH_NOT_FOUND", "菜品不存在", HttpStatus.NOT_FOUND);
    }
    return dish;
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private DishDto toDto(DishEntity dish) {
    return new DishDto(
      dish.getId(),
      dish.getName(),
      dish.getCategory(),
      dish.getStatus(),
      dish.getStepJin(),
      dish.getStockJin(),
      dish.getImageKey(),
      dish.getImageUrl(),
      dish.getDescription(),
      dish.getSortOrder(),
      dish.getCreatedAt(),
      dish.getUpdatedAt(),
      dish.getDeletedAt()
    );
  }

  private Map<String, Object> dishLogValue(DishEntity dish) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("category", dish.getCategory());
    value.put("description", dish.getDescription());
    value.put("imageKey", dish.getImageKey());
    value.put("imageUrl", dish.getImageUrl());
    value.put("name", dish.getName());
    value.put("sortOrder", dish.getSortOrder());
    value.put("status", dish.getStatus());
    value.put("stepJin", dish.getStepJin() == null ? null : dish.getStepJin().toPlainString());
    value.put("stockJin", dish.getStockJin() == null ? null : dish.getStockJin().toPlainString());
    return value;
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String dishId,
    String action,
    Object beforeValue,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource("dish");
    log.setResourceId(dishId);
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

  private String nullableText(String value) {
    String trimmed = value == null ? "" : value.trim();
    return StringUtils.hasText(trimmed) ? trimmed : null;
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private record NormalizedDishInput(
    String name,
    String category,
    String status,
    BigDecimal stepJin,
    BigDecimal stockJin,
    String imageKey,
    String imageUrl,
    String description,
    Integer sortOrder
  ) {}

  private static class ImportDishAccumulator {
    private int createdDishes = 0;
    private int failedRows = 0;
    private int importedRows = 0;
    private final List<ImportFailureDto> failures = new ArrayList<>();
    private final int totalRows;
    private int updatedDishes = 0;

    private ImportDishAccumulator(int totalRows) {
      this.totalRows = totalRows;
    }

    private List<ImportFailureDto> failures() {
      return failures;
    }

    private DishImportResultDto toDto() {
      return new DishImportResultDto(
        createdDishes,
        failedRows,
        List.copyOf(failures),
        importedRows,
        totalRows,
        updatedDishes
      );
    }
  }
}
