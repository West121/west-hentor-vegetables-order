package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniBenefitSelectionRequest;
import cn.hentor.vegetables.dto.MiniReservationBenefitDto;
import cn.hentor.vegetables.dto.MiniReservationDto;
import cn.hentor.vegetables.dto.MiniReservationItemDto;
import cn.hentor.vegetables.dto.MiniReservationItemRequest;
import cn.hentor.vegetables.dto.MiniReservationRequest;
import cn.hentor.vegetables.dto.MiniReservationResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.entity.AddressEntity;
import cn.hentor.vegetables.entity.DishEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.OrderBenefitItemEntity;
import cn.hentor.vegetables.entity.OrderChangeLogEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderItemEntity;
import cn.hentor.vegetables.entity.OrderShipmentEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.TaskDishEntity;
import cn.hentor.vegetables.entity.TaskEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.entity.UserPackageBenefitEntity;
import cn.hentor.vegetables.entity.UserPackageEntity;
import cn.hentor.vegetables.mapper.AddressMapper;
import cn.hentor.vegetables.mapper.DishMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.OrderBenefitItemMapper;
import cn.hentor.vegetables.mapper.OrderChangeLogMapper;
import cn.hentor.vegetables.mapper.OrderItemMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.OrderShipmentMapper;
import cn.hentor.vegetables.mapper.TaskDishMapper;
import cn.hentor.vegetables.mapper.TaskMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import cn.hentor.vegetables.mapper.UserPackageBenefitMapper;
import cn.hentor.vegetables.mapper.UserPackageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MiniReservationService {
  private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
  private static final BigDecimal ZERO = new BigDecimal("0.00");

  private final AddressMapper addressMapper;
  private final DishMapper dishMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final MiniAuthService miniAuthService;
  private final ObjectMapper objectMapper;
  private final OrderBenefitItemMapper orderBenefitItemMapper;
  private final OrderChangeLogMapper orderChangeLogMapper;
  private final OrderItemMapper orderItemMapper;
  private final OrderMapper orderMapper;
  private final OrderShipmentMapper orderShipmentMapper;
  private final TaskDishMapper taskDishMapper;
  private final TaskMapper taskMapper;
  private final UserMapper userMapper;
  private final UserPackageBenefitMapper userPackageBenefitMapper;
  private final UserPackageMapper userPackageMapper;

  public MiniReservationService(
    AddressMapper addressMapper,
    DishMapper dishMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    MiniAuthService miniAuthService,
    ObjectMapper objectMapper,
    OrderBenefitItemMapper orderBenefitItemMapper,
    OrderChangeLogMapper orderChangeLogMapper,
    OrderItemMapper orderItemMapper,
    OrderMapper orderMapper,
    OrderShipmentMapper orderShipmentMapper,
    TaskDishMapper taskDishMapper,
    TaskMapper taskMapper,
    UserMapper userMapper,
    UserPackageBenefitMapper userPackageBenefitMapper,
    UserPackageMapper userPackageMapper
  ) {
    this.addressMapper = addressMapper;
    this.dishMapper = dishMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.miniAuthService = miniAuthService;
    this.objectMapper = objectMapper;
    this.orderBenefitItemMapper = orderBenefitItemMapper;
    this.orderChangeLogMapper = orderChangeLogMapper;
    this.orderItemMapper = orderItemMapper;
    this.orderMapper = orderMapper;
    this.orderShipmentMapper = orderShipmentMapper;
    this.taskDishMapper = taskDishMapper;
    this.taskMapper = taskMapper;
    this.userMapper = userMapper;
    this.userPackageBenefitMapper = userPackageBenefitMapper;
    this.userPackageMapper = userPackageMapper;
  }

  @Transactional
  public MiniReservationResponse submit(MiniSessionContext session, MiniReservationRequest request) {
    return saveReservation(session, request, request.orderId());
  }

  @Transactional
  public MiniReservationResponse update(
    MiniSessionContext session,
    String orderId,
    MiniReservationRequest request
  ) {
    return saveReservation(session, request, orderId);
  }

  private MiniReservationResponse saveReservation(
    MiniSessionContext session,
    MiniReservationRequest request,
    String orderId
  ) {
    if (request.items() == null || request.items().isEmpty()) {
      throw reservationError("EMPTY_ITEMS", "请选择菜品");
    }

    LocalDateTime now = LocalDateTime.now(BUSINESS_ZONE);
    StoreEntity store = miniAuthService.findAvailableStore(request.storeCode());
    TaskEntity activeTask = loadActiveTask(store.getId(), now);
    if (isPastCutoff(activeTask == null ? store.getCutoffTime() : activeTask.getCutoffTime(), now)) {
      throw reservationError("ORDER_CUTOFF_PASSED", "今日已截单，不能提交预订");
    }

    ensureActiveMember(session.userId(), store.getId());
    UserPackageEntity userPackage = loadUserPackage(session.userId(), store.getId(), request.userPackageId());
    List<UserPackageBenefitEntity> packageBenefits = loadPackageBenefits(userPackage.getId());
    AddressEntity address = loadAddress(session.userId(), store.getId(), request.addressId());
    validateDeliveryRange(address, store);

    List<String> newDishIds = distinctDishIds(request.items());
    if (newDishIds.size() != request.items().size()) {
      throw reservationError("DUPLICATE_DISH", "菜品不能重复提交");
    }
    validateTaskDishes(activeTask, newDishIds);

    LocalDate today = LocalDate.now(BUSINESS_ZONE);
    OrderEntity existingOrder = StringUtils.hasText(orderId)
      ? loadEditableOrder(session.userId(), store.getId(), userPackage.getId(), orderId, today)
      : null;
    if (StringUtils.hasText(orderId) && existingOrder == null) {
      throw reservationError("ORDER_NOT_EDITABLE", "当前订单不可修改");
    }

    if (!StringUtils.hasText(orderId)) {
      ensureCurrentPackage(session.userId(), store.getId(), userPackage.getId());
      ensureNoTodayOrder(session.userId(), store.getId(), today);
      if (safeInt(userPackage.getUsedTimes()) >= safeInt(userPackage.getTotalTimes())) {
        throw reservationError("PACKAGE_USED_UP", "套餐次数已用完");
      }
    }

    List<OrderItemEntity> existingItems = existingOrder == null
      ? List.of()
      : loadOrderItems(existingOrder.getId());
    List<OrderBenefitItemEntity> existingBenefits = existingOrder == null
      ? List.of()
      : loadOrderBenefits(existingOrder.getId());
    Map<String, BigDecimal> oldWeightsByDishId = sumWeightsByDishId(existingItems);
    List<DishEntity> dishes = loadDishes(store.getId(), newDishIds, oldWeightsByDishId.keySet());
    Map<String, DishEntity> dishById = new HashMap<>();
    Map<String, BigDecimal> currentStockByDishId = new HashMap<>();
    for (DishEntity dish : dishes) {
      dishById.put(dish.getId(), dish);
      currentStockByDishId.put(dish.getId(), zeroIfNull(dish.getStockJin()));
    }

    List<OrderItemEntity> normalizedItems = normalizeItems(request.items(), dishById, oldWeightsByDishId);
    BigDecimal totalWeightJin = normalizedItems
      .stream()
      .map(OrderItemEntity::getWeightJin)
      .reduce(BigDecimal.ZERO, BigDecimal::add);
    if (totalWeightJin.compareTo(zeroIfNull(userPackage.getWeightLimitJin())) > 0) {
      throw reservationError("WEIGHT_LIMIT_EXCEEDED", "已超过套餐本次可预订重量");
    }

    Map<String, BigDecimal> newWeightsByDishId = sumWeightsByDishId(normalizedItems);
    List<MiniBenefitSelectionRequest> benefitSelections = request.benefitSelections();
    if (StringUtils.hasText(orderId) && benefitSelections == null) {
      benefitSelections = existingBenefits
        .stream()
        .filter(benefit -> StringUtils.hasText(benefit.getUserPackageBenefitId()))
        .map(benefit -> new MiniBenefitSelectionRequest(benefit.getQuantity(), benefit.getUserPackageBenefitId()))
        .toList();
    }
    List<OrderBenefitItemEntity> selectedBenefits = normalizeSelectedBenefits(
      restoreEditableBenefitAllowance(packageBenefits, existingBenefits),
      benefitSelections
    );

    String addressSnapshot = toJson(addressSnapshot(address));
    OrderEntity savedOrder;
    if (existingOrder == null) {
      savedOrder = createOrder(
        session.userId(),
        store.getId(),
        userPackage.getId(),
        request,
        address,
        addressSnapshot,
        normalizedItems,
        selectedBenefits,
        totalWeightJin,
        now
      );
      applyInventoryDelta(currentStockByDishId, oldWeightsByDishId, newWeightsByDishId, now);
      incrementPackageUse(userPackage, now);
    } else {
      List<Map<String, Object>> beforeItems = snapshotItems(existingItems);
      String beforeAddress = existingOrder.getAddressSnapshot();
      replaceOrderChildren(existingOrder.getId());
      savedOrder = updateOrder(
        existingOrder,
        request,
        address,
        addressSnapshot,
        normalizedItems,
        selectedBenefits,
        totalWeightJin,
        now
      );
      applyInventoryDelta(currentStockByDishId, oldWeightsByDishId, newWeightsByDishId, now);
      writeChangeLog(existingOrder.getId(), beforeItems, snapshotItems(normalizedItems), beforeAddress, addressSnapshot, now);
      restoreBenefitUsage(existingBenefits);
    }

    consumeBenefitUsage(selectedBenefits);
    return new MiniReservationResponse(toReservationDto(savedOrder, normalizedItems, selectedBenefits));
  }

  private TaskEntity loadActiveTask(String storeId, LocalDateTime now) {
    return taskMapper.selectOne(
      new LambdaQueryWrapper<TaskEntity>()
        .eq(TaskEntity::getStoreId, storeId)
        .le(TaskEntity::getStartsAt, now)
        .ge(TaskEntity::getEndsAt, now)
        .apply("\"status\" = 'ACTIVE'")
        .orderByDesc(TaskEntity::getStartsAt)
        .orderByDesc(TaskEntity::getCreatedAt)
        .last("limit 1")
    );
  }

  private void ensureActiveMember(String userId, String storeId) {
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, userId)
        .eq(MemberStoreBindingEntity::getStoreId, storeId)
        .last("limit 1")
    );
    if (binding == null) {
      throw reservationError("STORE_REQUIRED", "请先绑定当前门店后再预订");
    }

    UserEntity user = userMapper.selectById(userId);
    if (!"ACTIVE".equals(binding.getStatus()) || user == null || !"ACTIVE".equals(user.getStatus())) {
      String reason = user == null ? "" : normalizeNullableText(user.getDisabledReason());
      throw reservationError("MEMBER_DISABLED", StringUtils.hasText(reason) ? "会员已停用：" + reason : "会员已停用，暂不能预订");
    }
  }

  private UserPackageEntity loadUserPackage(String userId, String storeId, String userPackageId) {
    UserPackageEntity userPackage = userPackageMapper.selectOne(
      new LambdaQueryWrapper<UserPackageEntity>()
        .eq(UserPackageEntity::getId, userPackageId)
        .eq(UserPackageEntity::getUserId, userId)
        .eq(UserPackageEntity::getStoreId, storeId)
        .last("limit 1")
    );
    if (userPackage == null) {
      throw reservationError("PACKAGE_NOT_FOUND", "套餐不存在");
    }
    if ("FROZEN".equals(userPackage.getStatus())) {
      throw reservationError("PACKAGE_UNAVAILABLE", "套餐已冻结，暂不能预订");
    }
    if (!"ACTIVE".equals(userPackage.getStatus())) {
      throw reservationError("PACKAGE_UNAVAILABLE", "套餐不可用");
    }
    return userPackage;
  }

  private List<UserPackageBenefitEntity> loadPackageBenefits(String userPackageId) {
    return userPackageBenefitMapper.selectList(
      new LambdaQueryWrapper<UserPackageBenefitEntity>()
        .eq(UserPackageBenefitEntity::getUserPackageId, userPackageId)
        .orderByAsc(UserPackageBenefitEntity::getSortOrder)
        .orderByAsc(UserPackageBenefitEntity::getCreatedAt)
    );
  }

  private AddressEntity loadAddress(String userId, String storeId, String addressId) {
    AddressEntity address = addressMapper.selectOne(
      new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getId, addressId)
        .eq(AddressEntity::getUserId, userId)
        .eq(AddressEntity::getStoreId, storeId)
        .last("limit 1")
    );
    if (address == null) {
      throw reservationError("ADDRESS_NOT_FOUND", "配送地址不存在");
    }
    return address;
  }

  private List<String> distinctDishIds(List<MiniReservationItemRequest> items) {
    Set<String> seen = new HashSet<>();
    List<String> dishIds = new ArrayList<>();
    for (MiniReservationItemRequest item : items) {
      String dishId = normalizeRequiredText(item.dishId(), "DISH_NOT_FOUND", "菜品不存在或已下架");
      if (seen.add(dishId)) {
        dishIds.add(dishId);
      }
    }
    return dishIds;
  }

  private void validateTaskDishes(TaskEntity activeTask, List<String> dishIds) {
    if (activeTask == null) {
      return;
    }

    Set<String> taskDishIds = taskDishMapper.selectList(
        new LambdaQueryWrapper<TaskDishEntity>()
          .eq(TaskDishEntity::getTaskId, activeTask.getId())
      )
      .stream()
      .map(TaskDishEntity::getDishId)
      .collect(java.util.stream.Collectors.toSet());
    if (dishIds.stream().anyMatch(dishId -> !taskDishIds.contains(dishId))) {
      throw reservationError("DISH_NOT_IN_ACTIVE_TASK", "菜品不在今日可预订任务中");
    }
  }

  private OrderEntity loadEditableOrder(
    String userId,
    String storeId,
    String userPackageId,
    String orderId,
    LocalDate today
  ) {
    return orderMapper.selectOne(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getId, orderId.trim())
        .eq(OrderEntity::getUserId, userId)
        .eq(OrderEntity::getStoreId, storeId)
        .eq(OrderEntity::getUserPackageId, userPackageId)
        .ge(OrderEntity::getCreatedAt, today.atStartOfDay())
        .lt(OrderEntity::getCreatedAt, today.plusDays(1).atStartOfDay())
        .isNull(OrderEntity::getDeletedByUserAt)
        .apply("\"status\" = 'PENDING_SHIPMENT'")
        .last("limit 1")
    );
  }

  private void ensureCurrentPackage(String userId, String storeId, String userPackageId) {
    UserPackageEntity firstUsable = userPackageMapper.selectList(
        new LambdaQueryWrapper<UserPackageEntity>()
          .eq(UserPackageEntity::getUserId, userId)
          .eq(UserPackageEntity::getStoreId, storeId)
          .apply("\"status\" = 'ACTIVE'")
          .orderByAsc(UserPackageEntity::getCreatedAt)
          .orderByAsc(UserPackageEntity::getId)
      )
      .stream()
      .filter(item -> safeInt(item.getUsedTimes()) < safeInt(item.getTotalTimes()))
      .findFirst()
      .orElse(null);
    if (firstUsable != null && !Objects.equals(firstUsable.getId(), userPackageId)) {
      throw reservationError("PACKAGE_NOT_CURRENT", "请刷新后使用最早可用套餐预订");
    }
  }

  private void ensureNoTodayOrder(String userId, String storeId, LocalDate today) {
    Long existingCount = orderMapper.selectCount(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getUserId, userId)
        .eq(OrderEntity::getStoreId, storeId)
        .ge(OrderEntity::getCreatedAt, today.atStartOfDay())
        .lt(OrderEntity::getCreatedAt, today.plusDays(1).atStartOfDay())
        .isNull(OrderEntity::getDeletedByUserAt)
        .apply("\"status\" not in ('CANCELED', 'VOIDED')")
    );
    if (existingCount != null && existingCount > 0) {
      throw reservationError("ORDER_ALREADY_EXISTS", "今日已提交预订，请修改今日预订");
    }
  }

  private List<OrderItemEntity> loadOrderItems(String orderId) {
    return orderItemMapper.selectList(
      new LambdaQueryWrapper<OrderItemEntity>()
        .eq(OrderItemEntity::getOrderId, orderId)
        .orderByAsc(OrderItemEntity::getId)
    );
  }

  private List<OrderBenefitItemEntity> loadOrderBenefits(String orderId) {
    return orderBenefitItemMapper.selectList(
      new LambdaQueryWrapper<OrderBenefitItemEntity>()
        .eq(OrderBenefitItemEntity::getOrderId, orderId)
        .orderByAsc(OrderBenefitItemEntity::getId)
    );
  }

  private List<DishEntity> loadDishes(String storeId, List<String> newDishIds, Set<String> oldDishIds) {
    Set<String> dishIds = new HashSet<>(newDishIds);
    dishIds.addAll(oldDishIds);
    if (dishIds.isEmpty()) {
      return List.of();
    }
    return dishMapper.selectList(
      new LambdaQueryWrapper<DishEntity>()
        .eq(DishEntity::getStoreId, storeId)
        .isNull(DishEntity::getDeletedAt)
        .in(DishEntity::getId, dishIds)
    );
  }

  private List<OrderItemEntity> normalizeItems(
    List<MiniReservationItemRequest> items,
    Map<String, DishEntity> dishById,
    Map<String, BigDecimal> oldWeightsByDishId
  ) {
    List<OrderItemEntity> result = new ArrayList<>();
    for (MiniReservationItemRequest item : items) {
      DishEntity dish = dishById.get(item.dishId().trim());
      if (dish == null || !"ON_SALE".equals(dish.getStatus())) {
        throw reservationError("DISH_NOT_FOUND", "菜品不存在或已下架");
      }

      BigDecimal weight = normalizePositiveDecimal(item.weightJin(), "INVALID_WEIGHT", "菜品重量必须大于 0");
      BigDecimal step = zeroIfNull(dish.getStepJin());
      if (step.compareTo(BigDecimal.ZERO) <= 0 || !matchesStep(weight, step)) {
        throw reservationError("INVALID_WEIGHT_STEP", "菜品重量不符合起订步进");
      }

      BigDecimal reservedWeight = oldWeightsByDishId.getOrDefault(dish.getId(), BigDecimal.ZERO);
      BigDecimal availableStock = zeroIfNull(dish.getStockJin()).add(reservedWeight);
      if (weight.compareTo(availableStock) > 0) {
        throw reservationError("DISH_STOCK_NOT_ENOUGH", "菜品库存不足");
      }

      OrderItemEntity normalized = new OrderItemEntity();
      normalized.setId(id());
      normalized.setDishId(dish.getId());
      normalized.setDishNameSnapshot(dish.getName());
      normalized.setStepJinSnapshot(step.setScale(2, RoundingMode.HALF_UP));
      normalized.setWeightJin(weight);
      result.add(normalized);
    }
    return result;
  }

  private List<OrderBenefitItemEntity> restoreEditableBenefitAllowance(
    List<UserPackageBenefitEntity> benefits,
    List<OrderBenefitItemEntity> existingBenefits
  ) {
    Map<String, BigDecimal> existingByBenefitId = new HashMap<>();
    for (OrderBenefitItemEntity benefit : existingBenefits) {
      if (StringUtils.hasText(benefit.getUserPackageBenefitId())) {
        existingByBenefitId.merge(benefit.getUserPackageBenefitId(), zeroIfNull(benefit.getQuantity()), BigDecimal::add);
      }
    }

    List<OrderBenefitItemEntity> restored = new ArrayList<>();
    for (UserPackageBenefitEntity benefit : benefits) {
      UserPackageBenefitEntity copy = new UserPackageBenefitEntity();
      copy.setId(benefit.getId());
      copy.setKind(benefit.getKind());
      copy.setNameSnapshot(benefit.getNameSnapshot());
      copy.setShipmentGroup(benefit.getShipmentGroup());
      copy.setTotalQuantity(benefit.getTotalQuantity());
      BigDecimal used = zeroIfNull(benefit.getUsedQuantity())
        .subtract(existingByBenefitId.getOrDefault(benefit.getId(), BigDecimal.ZERO))
        .max(BigDecimal.ZERO);
      copy.setUsedQuantity(used);
      copy.setUnitSnapshot(benefit.getUnitSnapshot());
      restored.add(toAllowance(copy));
    }
    return restored;
  }

  private OrderBenefitItemEntity toAllowance(UserPackageBenefitEntity benefit) {
    OrderBenefitItemEntity allowance = new OrderBenefitItemEntity();
    allowance.setUserPackageBenefitId(benefit.getId());
    allowance.setKind(benefit.getKind());
    allowance.setNameSnapshot(benefit.getNameSnapshot());
    allowance.setShipmentGroup(benefit.getShipmentGroup());
    allowance.setQuantity(zeroIfNull(benefit.getTotalQuantity()).subtract(zeroIfNull(benefit.getUsedQuantity())).max(BigDecimal.ZERO));
    allowance.setUnitSnapshot(benefit.getUnitSnapshot());
    return allowance;
  }

  private List<OrderBenefitItemEntity> normalizeSelectedBenefits(
    List<OrderBenefitItemEntity> allowances,
    List<MiniBenefitSelectionRequest> selections
  ) {
    if (selections == null || selections.isEmpty()) {
      return List.of();
    }

    Map<String, OrderBenefitItemEntity> allowanceById = new HashMap<>();
    for (OrderBenefitItemEntity allowance : allowances) {
      allowanceById.put(allowance.getUserPackageBenefitId(), allowance);
    }

    Set<String> seen = new HashSet<>();
    List<OrderBenefitItemEntity> selected = new ArrayList<>();
    for (MiniBenefitSelectionRequest selection : selections) {
      String benefitId = normalizeRequiredText(selection.userPackageBenefitId(), "BENEFIT_NOT_AVAILABLE", "附加权益不可用");
      if (!seen.add(benefitId)) {
        throw reservationError("DUPLICATE_BENEFIT", "附加权益不能重复选择");
      }

      OrderBenefitItemEntity allowance = allowanceById.get(benefitId);
      if (allowance == null) {
        throw reservationError("BENEFIT_NOT_AVAILABLE", "附加权益不可用");
      }

      BigDecimal quantity = normalizePositiveDecimal(selection.quantity(), "INVALID_BENEFIT_QUANTITY", "附加权益数量必须大于 0");
      if (quantity.compareTo(zeroIfNull(allowance.getQuantity())) > 0) {
        throw reservationError("BENEFIT_QUANTITY_EXCEEDED", "附加权益剩余数量不足");
      }

      OrderBenefitItemEntity item = new OrderBenefitItemEntity();
      item.setId(id());
      item.setUserPackageBenefitId(benefitId);
      item.setKind(allowance.getKind());
      item.setNameSnapshot(allowance.getNameSnapshot());
      item.setShipmentGroup(allowance.getShipmentGroup());
      item.setQuantity(quantity);
      item.setUnitSnapshot(allowance.getUnitSnapshot());
      selected.add(item);
    }
    return selected;
  }

  private OrderEntity createOrder(
    String userId,
    String storeId,
    String userPackageId,
    MiniReservationRequest request,
    AddressEntity address,
    String addressSnapshot,
    List<OrderItemEntity> items,
    List<OrderBenefitItemEntity> benefits,
    BigDecimal totalWeightJin,
    LocalDateTime now
  ) {
    OrderEntity order = new OrderEntity();
    order.setId(id());
    order.setAddressId(address.getId());
    order.setAddressSnapshot(addressSnapshot);
    order.setCreatedAt(now);
    order.setOrderNo(createOrderNo(now));
    order.setStatus("PENDING_SHIPMENT");
    order.setStoreId(storeId);
    order.setTotalWeightJin(totalWeightJin);
    order.setUpdatedAt(now);
    order.setUserId(userId);
    order.setUserPackageId(userPackageId);
    order.setUserVisibleRemark(normalizeNullableText(request.userVisibleRemark()));
    orderMapper.insertMiniOrder(order);
    insertOrderChildren(order.getId(), items, benefits, now);
    return order;
  }

  private OrderEntity updateOrder(
    OrderEntity order,
    MiniReservationRequest request,
    AddressEntity address,
    String addressSnapshot,
    List<OrderItemEntity> items,
    List<OrderBenefitItemEntity> benefits,
    BigDecimal totalWeightJin,
    LocalDateTime now
  ) {
    order.setAddressId(address.getId());
    order.setAddressSnapshot(addressSnapshot);
    order.setModifiedAt(now);
    order.setTotalWeightJin(totalWeightJin);
    order.setUpdatedAt(now);
    order.setUserVisibleRemark(normalizeNullableText(request.userVisibleRemark()));
    orderMapper.updateMiniOrder(order);
    insertOrderChildren(order.getId(), items, benefits, now);
    return order;
  }

  private void insertOrderChildren(
    String orderId,
    List<OrderItemEntity> items,
    List<OrderBenefitItemEntity> benefits,
    LocalDateTime now
  ) {
    for (OrderItemEntity item : items) {
      item.setOrderId(orderId);
      orderItemMapper.insert(item);
    }

    for (OrderBenefitItemEntity benefit : benefits) {
      benefit.setOrderId(orderId);
      orderBenefitItemMapper.insert(benefit);
    }

    int sortOrder = 0;
    for (ShipmentDraft shipment : buildShipments(benefits)) {
      OrderShipmentEntity entity = new OrderShipmentEntity();
      entity.setId(id());
      entity.setCreatedAt(now);
      entity.setOrderId(orderId);
      entity.setPackageName(shipment.packageName());
      entity.setPackageType(shipment.packageType());
      entity.setSortOrder(sortOrder++);
      entity.setStatus("PENDING");
      entity.setUpdatedAt(now);
      orderShipmentMapper.insert(entity);
    }
  }

  private void replaceOrderChildren(String orderId) {
    orderItemMapper.delete(new LambdaQueryWrapper<OrderItemEntity>().eq(OrderItemEntity::getOrderId, orderId));
    orderBenefitItemMapper.delete(new LambdaQueryWrapper<OrderBenefitItemEntity>().eq(OrderBenefitItemEntity::getOrderId, orderId));
    orderShipmentMapper.delete(new LambdaQueryWrapper<OrderShipmentEntity>().eq(OrderShipmentEntity::getOrderId, orderId));
  }

  private List<ShipmentDraft> buildShipments(List<OrderBenefitItemEntity> benefits) {
    List<ShipmentDraft> shipments = new ArrayList<>();
    shipments.add(new ShipmentDraft("VEGETABLE", "蔬菜包裹"));
    Set<String> seen = new HashSet<>();
    seen.add("VEGETABLE:蔬菜包裹");

    for (OrderBenefitItemEntity benefit : benefits) {
      String packageType = StringUtils.hasText(benefit.getKind()) ? benefit.getKind() : "EXTRA";
      String packageName = StringUtils.hasText(benefit.getShipmentGroup())
        ? benefit.getShipmentGroup().trim()
        : benefit.getNameSnapshot() + "包裹";
      String key = packageType + ":" + packageName;
      if (seen.add(key)) {
        shipments.add(new ShipmentDraft(packageType, packageName));
      }
    }
    return shipments;
  }

  private void applyInventoryDelta(
    Map<String, BigDecimal> currentStockByDishId,
    Map<String, BigDecimal> oldWeightsByDishId,
    Map<String, BigDecimal> newWeightsByDishId,
    LocalDateTime now
  ) {
    Set<String> dishIds = new HashSet<>(oldWeightsByDishId.keySet());
    dishIds.addAll(newWeightsByDishId.keySet());

    for (String dishId : dishIds) {
      BigDecimal oldWeight = oldWeightsByDishId.getOrDefault(dishId, BigDecimal.ZERO);
      BigDecimal newWeight = newWeightsByDishId.getOrDefault(dishId, BigDecimal.ZERO);
      BigDecimal delta = oldWeight.subtract(newWeight);
      if (delta.compareTo(BigDecimal.ZERO) == 0) {
        continue;
      }
      BigDecimal nextStock = currentStockByDishId.getOrDefault(dishId, BigDecimal.ZERO).add(delta).max(BigDecimal.ZERO);
      if (nextStock.compareTo(BigDecimal.ZERO) == 0) {
        dishMapper.updateStockAndOffSale(dishId, nextStock, now);
      } else {
        dishMapper.updateStock(dishId, nextStock, now);
      }
    }
  }

  private void incrementPackageUse(UserPackageEntity userPackage, LocalDateTime now) {
    userPackageMapper.incrementUsedTimes(userPackage.getId(), now, now);
  }

  private void restoreBenefitUsage(List<OrderBenefitItemEntity> benefits) {
    for (OrderBenefitItemEntity benefit : benefits) {
      if (!StringUtils.hasText(benefit.getUserPackageBenefitId())) {
        continue;
      }
      UserPackageBenefitEntity entity = userPackageBenefitMapper.selectById(benefit.getUserPackageBenefitId());
      if (entity == null) {
        continue;
      }
      entity.setUsedQuantity(zeroIfNull(entity.getUsedQuantity()).subtract(zeroIfNull(benefit.getQuantity())).max(BigDecimal.ZERO));
      entity.setUpdatedAt(LocalDateTime.now(BUSINESS_ZONE));
      userPackageBenefitMapper.updateById(entity);
    }
  }

  private void consumeBenefitUsage(List<OrderBenefitItemEntity> benefits) {
    for (OrderBenefitItemEntity benefit : benefits) {
      if (!StringUtils.hasText(benefit.getUserPackageBenefitId())) {
        continue;
      }
      UserPackageBenefitEntity entity = userPackageBenefitMapper.selectById(benefit.getUserPackageBenefitId());
      if (entity == null) {
        continue;
      }
      entity.setUsedQuantity(zeroIfNull(entity.getUsedQuantity()).add(zeroIfNull(benefit.getQuantity())));
      entity.setUpdatedAt(LocalDateTime.now(BUSINESS_ZONE));
      userPackageBenefitMapper.updateById(entity);
    }
  }

  private void writeChangeLog(
    String orderId,
    List<Map<String, Object>> beforeItems,
    List<Map<String, Object>> afterItems,
    String beforeAddress,
    String afterAddress,
    LocalDateTime now
  ) {
    OrderChangeLogEntity log = new OrderChangeLogEntity();
    log.setId(id());
    log.setAfterAddress(afterAddress);
    log.setAfterItems(toJson(afterItems));
    log.setBeforeAddress(StringUtils.hasText(beforeAddress) ? beforeAddress : "{}");
    log.setBeforeItems(toJson(beforeItems));
    log.setCreatedAt(now);
    log.setOrderId(orderId);
    log.setSource("MINIAPP");
    orderChangeLogMapper.insertMiniChangeLog(log);
  }

  private Map<String, BigDecimal> sumWeightsByDishId(List<OrderItemEntity> items) {
    Map<String, BigDecimal> result = new HashMap<>();
    for (OrderItemEntity item : items) {
      result.merge(item.getDishId(), zeroIfNull(item.getWeightJin()), BigDecimal::add);
    }
    return result;
  }

  private List<Map<String, Object>> snapshotItems(List<OrderItemEntity> items) {
    return items
      .stream()
      .map(item -> {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("dishId", item.getDishId());
        snapshot.put("dishNameSnapshot", item.getDishNameSnapshot());
        snapshot.put("weightJin", zeroIfNull(item.getWeightJin()));
        return snapshot;
      })
      .toList();
  }

  private Map<String, Object> addressSnapshot(AddressEntity address) {
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("receiverName", address.getReceiverName());
    snapshot.put("receiverPhone", address.getReceiverPhone());
    snapshot.put("province", address.getProvince());
    snapshot.put("city", address.getCity());
    snapshot.put("district", address.getDistrict());
    snapshot.put("detail", address.getDetail());
    return snapshot;
  }

  private MiniReservationDto toReservationDto(
    OrderEntity order,
    List<OrderItemEntity> items,
    List<OrderBenefitItemEntity> benefits
  ) {
    return new MiniReservationDto(
      benefits
        .stream()
        .map(benefit -> new MiniReservationBenefitDto(
          benefit.getKind(),
          benefit.getNameSnapshot(),
          zeroIfNull(benefit.getQuantity()),
          benefit.getUnitSnapshot()
        ))
        .toList(),
      order.getId(),
      items
        .stream()
        .map(item -> new MiniReservationItemDto(
          item.getDishId(),
          item.getDishNameSnapshot(),
          zeroIfNull(item.getWeightJin())
        ))
        .toList(),
      order.getOrderNo(),
      "PENDING_SHIPMENT",
      zeroIfNull(order.getTotalWeightJin())
    );
  }

  private boolean isPastCutoff(String cutoffTime, LocalDateTime now) {
    String normalized = StringUtils.hasText(cutoffTime) ? cutoffTime.trim() : "18:00";
    String[] parts = normalized.split(":");
    if (parts.length != 2) {
      return false;
    }
    try {
      int hour = Integer.parseInt(parts[0]);
      int minute = Integer.parseInt(parts[1]);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return false;
      }
      return now.getHour() * 60 + now.getMinute() >= hour * 60 + minute;
    } catch (NumberFormatException error) {
      return false;
    }
  }

  private void validateDeliveryRange(AddressEntity address, StoreEntity store) {
    List<String> provinces = readJsonStringArray(store.getDeliveryProvinces());
    List<String> cities = readJsonStringArray(store.getDeliveryCities());
    if (!provinces.isEmpty() && !provinces.contains(normalizeNullableText(address.getProvince()))) {
      throw reservationError("ADDRESS_OUT_OF_DELIVERY_RANGE", "当前门店仅配送：" + String.join("、", provinces));
    }
    if (!cities.isEmpty() && !cities.contains(normalizeNullableText(address.getCity()))) {
      throw reservationError("ADDRESS_OUT_OF_DELIVERY_RANGE", "当前门店仅配送城市：" + String.join("、", cities));
    }
  }

  private List<String> readJsonStringArray(String value) {
    if (!StringUtils.hasText(value)) {
      return List.of();
    }
    try {
      List<String> raw = objectMapper.readValue(value, new TypeReference<>() {});
      return raw
        .stream()
        .map(this::normalizeNullableText)
        .filter(StringUtils::hasText)
        .distinct()
        .toList();
    } catch (JsonProcessingException error) {
      return List.of();
    }
  }

  private BigDecimal normalizePositiveDecimal(BigDecimal value, String code, String message) {
    if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
      throw reservationError(code, message);
    }
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private boolean matchesStep(BigDecimal weight, BigDecimal step) {
    BigDecimal remainder = weight.remainder(step).abs();
    return remainder.compareTo(new BigDecimal("0.000001")) <= 0 ||
      step.subtract(remainder).abs().compareTo(new BigDecimal("0.000001")) <= 0;
  }

  private String normalizeRequiredText(String value, String code, String message) {
    String normalized = normalizeNullableText(value);
    if (!StringUtils.hasText(normalized)) {
      throw reservationError(code, message);
    }
    return normalized;
  }

  private String normalizeNullableText(String value) {
    String normalized = value == null ? "" : value.trim();
    return StringUtils.hasText(normalized) ? normalized : null;
  }

  private BigDecimal zeroIfNull(BigDecimal value) {
    return value == null ? ZERO : value;
  }

  private int safeInt(Integer value) {
    return value == null ? 0 : value;
  }

  private String createOrderNo(LocalDateTime now) {
    String date = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    String millis = String.valueOf(System.currentTimeMillis());
    String timePart = millis.substring(Math.max(0, millis.length() - 8));
    String random = Long.toString(Math.abs(UUID.randomUUID().getMostSignificantBits()), 36)
      .toUpperCase()
      .substring(0, 4);
    return "OD" + date + timePart + random;
  }

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("JSON serialization failed", error);
    }
  }

  private ApiException reservationError(String code, String message) {
    return new ApiException(code, message, statusForReservationError(code));
  }

  private HttpStatus statusForReservationError(String code) {
    if (code.endsWith("_NOT_FOUND")) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      "PACKAGE_UNAVAILABLE".equals(code) ||
      "ORDER_ALREADY_EXISTS".equals(code) ||
      "ORDER_NOT_EDITABLE".equals(code)
    ) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.BAD_REQUEST;
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private record ShipmentDraft(String packageType, String packageName) {}
}
