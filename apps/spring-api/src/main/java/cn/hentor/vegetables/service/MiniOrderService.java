package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniOrderBenefitDto;
import cn.hentor.vegetables.dto.MiniOrderCancelRequest;
import cn.hentor.vegetables.dto.MiniOrderCancelResponse;
import cn.hentor.vegetables.dto.MiniOrderCancelResultDto;
import cn.hentor.vegetables.dto.MiniOrderHideResponse;
import cn.hentor.vegetables.dto.MiniOrderHideResultDto;
import cn.hentor.vegetables.dto.MiniOrderItemDto;
import cn.hentor.vegetables.dto.MiniOrderListData;
import cn.hentor.vegetables.dto.MiniOrderListItemDto;
import cn.hentor.vegetables.dto.MiniOrderPackageDto;
import cn.hentor.vegetables.dto.MiniOrderShipmentDto;
import cn.hentor.vegetables.dto.MiniOrderSummaryDto;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.entity.DishEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.OrderBenefitItemEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderItemEntity;
import cn.hentor.vegetables.entity.OrderShipmentEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.entity.UserPackageEntity;
import cn.hentor.vegetables.mapper.DishMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.OrderBenefitItemMapper;
import cn.hentor.vegetables.mapper.OrderItemMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.OrderShipmentMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import cn.hentor.vegetables.mapper.UserPackageBenefitMapper;
import cn.hentor.vegetables.mapper.UserPackageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MiniOrderService {
  private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

  private final DishMapper dishMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final MiniAuthService miniAuthService;
  private final ObjectMapper objectMapper;
  private final OrderBenefitItemMapper orderBenefitItemMapper;
  private final OrderItemMapper orderItemMapper;
  private final OrderMapper orderMapper;
  private final OrderShipmentMapper orderShipmentMapper;
  private final OrderShipmentTrackingService orderShipmentTrackingService;
  private final UserMapper userMapper;
  private final UserPackageBenefitMapper userPackageBenefitMapper;
  private final UserPackageMapper userPackageMapper;

  public MiniOrderService(
    DishMapper dishMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    MiniAuthService miniAuthService,
    ObjectMapper objectMapper,
    OrderBenefitItemMapper orderBenefitItemMapper,
    OrderItemMapper orderItemMapper,
    OrderMapper orderMapper,
    OrderShipmentMapper orderShipmentMapper,
    OrderShipmentTrackingService orderShipmentTrackingService,
    UserMapper userMapper,
    UserPackageBenefitMapper userPackageBenefitMapper,
    UserPackageMapper userPackageMapper
  ) {
    this.dishMapper = dishMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.miniAuthService = miniAuthService;
    this.objectMapper = objectMapper;
    this.orderBenefitItemMapper = orderBenefitItemMapper;
    this.orderItemMapper = orderItemMapper;
    this.orderMapper = orderMapper;
    this.orderShipmentMapper = orderShipmentMapper;
    this.orderShipmentTrackingService = orderShipmentTrackingService;
    this.userMapper = userMapper;
    this.userPackageBenefitMapper = userPackageBenefitMapper;
    this.userPackageMapper = userPackageMapper;
  }

  public MiniOrderListData listOrders(MiniSessionContext session, String storeCode) {
    StoreEntity store = miniAuthService.findAvailableStore(storeCode);
    return listOrdersForUser(session.userId(), store.getId());
  }

  public MiniOrderListData listOrdersForUser(String userId, String storeId) {
    List<OrderEntity> orders = orderMapper.selectList(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getStoreId, storeId)
        .eq(OrderEntity::getUserId, userId)
        .isNull(OrderEntity::getDeletedByUserAt)
        .orderByDesc(OrderEntity::getCreatedAt)
    );
    return buildOrderListData(orders);
  }

  public MiniOrderListItemDto getOrder(MiniSessionContext session, String storeCode, String orderId) {
    StoreEntity store = miniAuthService.findAvailableStore(storeCode);
    OrderEntity order = orderMapper.selectOne(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getId, orderId)
        .eq(OrderEntity::getStoreId, store.getId())
        .eq(OrderEntity::getUserId, session.userId())
        .isNull(OrderEntity::getDeletedByUserAt)
        .last("limit 1")
    );
    if (order == null) {
      throw new ApiException("ORDER_NOT_FOUND", "订单不存在", HttpStatus.NOT_FOUND);
    }
    return buildOrderListData(List.of(order)).items().getFirst();
  }

  @Transactional
  public MiniOrderCancelResponse cancel(
    MiniSessionContext session,
    String orderId,
    MiniOrderCancelRequest request
  ) {
    String reason = normalizeRequiredText(request.reason(), "CANCEL_REASON_REQUIRED", "请选择取消原因");
    StoreEntity store = miniAuthService.findAvailableStore(request.storeCode());
    ensureActiveMember(session.userId(), store.getId(), "会员已停用，暂不能取消订单", "请先绑定当前门店后再取消订单");

    OrderEntity order = orderMapper.selectOne(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getId, orderId)
        .eq(OrderEntity::getStoreId, store.getId())
        .eq(OrderEntity::getUserId, session.userId())
        .isNull(OrderEntity::getDeletedByUserAt)
        .last("limit 1")
    );
    if (order == null) {
      throw new ApiException("ORDER_NOT_FOUND", "订单不存在", HttpStatus.NOT_FOUND);
    }
    if (!"PENDING_SHIPMENT".equals(order.getStatus())) {
      throw new ApiException("ORDER_NOT_CANCELABLE", "当前订单不可取消", HttpStatus.CONFLICT);
    }

    LocalDateTime now = LocalDateTime.now(BUSINESS_ZONE);
    if (StringUtils.hasText(order.getUserPackageId())) {
      userPackageMapper.decrementUsedTimes(order.getUserPackageId(), now);
    }
    for (OrderBenefitItemEntity benefit : loadBenefits(order.getId())) {
      if (StringUtils.hasText(benefit.getUserPackageBenefitId())) {
        userPackageBenefitMapper.decrementUsedQuantity(
          benefit.getUserPackageBenefitId(),
          zeroIfNull(benefit.getQuantity()),
          now
        );
      }
    }

    OrderEntity update = new OrderEntity();
    update.setId(order.getId());
    update.setCancelReason(reason);
    update.setCanceledAt(now);
    update.setUpdatedAt(now);
    orderMapper.markCanceled(update);

    return new MiniOrderCancelResponse(
      new MiniOrderCancelResultDto(reason, now, order.getId(), "CANCELED")
    );
  }

  @Transactional
  public MiniOrderHideResponse hide(MiniSessionContext session, String storeCode, String orderId) {
    StoreEntity store = miniAuthService.findAvailableStore(storeCode);
    OrderEntity order = orderMapper.selectOne(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getId, orderId)
        .eq(OrderEntity::getStoreId, store.getId())
        .eq(OrderEntity::getUserId, session.userId())
        .isNull(OrderEntity::getDeletedByUserAt)
        .last("limit 1")
    );
    if (order == null) {
      throw new ApiException("ORDER_NOT_FOUND", "订单不存在", HttpStatus.NOT_FOUND);
    }
    if (!"CANCELED".equals(order.getStatus()) && !"VOIDED".equals(order.getStatus())) {
      throw new ApiException("ORDER_NOT_HIDEABLE", "当前订单不可删除", HttpStatus.CONFLICT);
    }

    LocalDateTime now = LocalDateTime.now(BUSINESS_ZONE);
    OrderEntity update = new OrderEntity();
    update.setId(order.getId());
    update.setDeletedByUserAt(now);
    update.setUpdatedAt(now);
    orderMapper.markDeletedByUser(update);
    return new MiniOrderHideResponse(new MiniOrderHideResultDto(now, order.getId()));
  }

  private MiniOrderListData buildOrderListData(List<OrderEntity> orders) {
    if (orders.isEmpty()) {
      return new MiniOrderListData(List.of(), new MiniOrderSummaryDto(0, 0, 0, 0, 0));
    }

    List<String> orderIds = orders.stream().map(OrderEntity::getId).toList();
    Map<String, List<OrderItemEntity>> itemsByOrderId = orderItemMapper.selectList(
        new LambdaQueryWrapper<OrderItemEntity>()
          .in(OrderItemEntity::getOrderId, orderIds)
          .orderByAsc(OrderItemEntity::getId)
      )
      .stream()
      .collect(Collectors.groupingBy(OrderItemEntity::getOrderId));
    Map<String, List<OrderBenefitItemEntity>> benefitsByOrderId = orderBenefitItemMapper.selectList(
        new LambdaQueryWrapper<OrderBenefitItemEntity>()
          .in(OrderBenefitItemEntity::getOrderId, orderIds)
          .orderByAsc(OrderBenefitItemEntity::getId)
      )
      .stream()
      .collect(Collectors.groupingBy(OrderBenefitItemEntity::getOrderId));
    Map<String, List<OrderShipmentEntity>> shipmentsByOrderId = orderShipmentMapper.selectList(
        new LambdaQueryWrapper<OrderShipmentEntity>()
          .in(OrderShipmentEntity::getOrderId, orderIds)
          .orderByAsc(OrderShipmentEntity::getSortOrder)
      )
      .stream()
      .collect(Collectors.groupingBy(OrderShipmentEntity::getOrderId));

    List<String> packageIds = orders
      .stream()
      .map(OrderEntity::getUserPackageId)
      .filter(StringUtils::hasText)
      .distinct()
      .toList();
    Map<String, UserPackageEntity> packageById = packageIds.isEmpty()
      ? Map.of()
      : userPackageMapper.selectList(new LambdaQueryWrapper<UserPackageEntity>().in(UserPackageEntity::getId, packageIds))
        .stream()
        .collect(Collectors.toMap(UserPackageEntity::getId, Function.identity()));

    List<MiniOrderListItemDto> items = orders
      .stream()
      .sorted(this::compareMiniOrders)
      .map(order -> toOrderListItem(
        order,
        itemsByOrderId.getOrDefault(order.getId(), List.of()),
        benefitsByOrderId.getOrDefault(order.getId(), List.of()),
        shipmentsByOrderId.getOrDefault(order.getId(), List.of()),
        packageById.get(order.getUserPackageId())
      ))
      .toList();

    return new MiniOrderListData(items, summarize(orders));
  }

  private int compareMiniOrders(OrderEntity left, OrderEntity right) {
    if ("PENDING_SHIPMENT".equals(left.getStatus()) && !"PENDING_SHIPMENT".equals(right.getStatus())) {
      return -1;
    }
    if (!"PENDING_SHIPMENT".equals(left.getStatus()) && "PENDING_SHIPMENT".equals(right.getStatus())) {
      return 1;
    }
    Comparator<LocalDateTime> comparator = Comparator.nullsLast(Comparator.naturalOrder());
    return comparator.compare(right.getCreatedAt(), left.getCreatedAt());
  }

  private MiniOrderListItemDto toOrderListItem(
    OrderEntity order,
    List<OrderItemEntity> orderItems,
    List<OrderBenefitItemEntity> orderBenefits,
    List<OrderShipmentEntity> shipments,
    UserPackageEntity userPackage
  ) {
    return new MiniOrderListItemDto(
      parseAddressSnapshot(order.getAddressSnapshot()),
      "PENDING_SHIPMENT".equals(order.getStatus()) && isToday(order.getCreatedAt()),
      order.getCanceledAt(),
      order.getCreatedAt(),
      order.getId(),
      orderBenefits.stream().map(this::toBenefitDto).toList(),
      orderItems.stream().map(this::toItemDto).toList(),
      order.getLogisticsNo(),
      shipments.stream().map(this::toShipmentDto).toList(),
      order.getModifiedAt(),
      order.getOrderNo(),
      order.getShippedAt(),
      order.getSignedAt(),
      order.getStatus(),
      zeroIfNull(order.getTotalWeightJin()),
      order.getUpdatedAt(),
      userPackage == null ? null : new MiniOrderPackageDto(userPackage.getId(), userPackage.getNameSnapshot()),
      order.getUserVisibleRemark()
    );
  }

  private MiniOrderSummaryDto summarize(List<OrderEntity> orders) {
    long pending = orders.stream().filter(order -> "PENDING_SHIPMENT".equals(order.getStatus())).count();
    long shipped = orders.stream().filter(order -> "SHIPPED".equals(order.getStatus())).count();
    long signed = orders.stream().filter(order -> "SIGNED".equals(order.getStatus())).count();
    long canceled = orders
      .stream()
      .filter(order -> "CANCELED".equals(order.getStatus()) || "VOIDED".equals(order.getStatus()))
      .count();
    return new MiniOrderSummaryDto(canceled, pending, shipped, signed, orders.size());
  }

  private void ensureActiveMember(String userId, String storeId, String disabledMessage, String storeRequiredMessage) {
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, userId)
        .eq(MemberStoreBindingEntity::getStoreId, storeId)
        .last("limit 1")
    );
    if (binding == null) {
      throw new ApiException("STORE_REQUIRED", storeRequiredMessage, HttpStatus.NOT_FOUND);
    }

    UserEntity user = userMapper.selectById(userId);
    if (!"ACTIVE".equals(binding.getStatus()) || user == null || !"ACTIVE".equals(user.getStatus())) {
      String reason = user == null ? "" : normalizeNullableText(user.getDisabledReason());
      throw new ApiException(
        "MEMBER_DISABLED",
        StringUtils.hasText(reason) ? "会员已停用：" + reason : disabledMessage,
        HttpStatus.FORBIDDEN
      );
    }
  }

  private List<OrderItemEntity> loadItems(String orderId) {
    return orderItemMapper.selectList(new LambdaQueryWrapper<OrderItemEntity>().eq(OrderItemEntity::getOrderId, orderId));
  }

  private List<OrderBenefitItemEntity> loadBenefits(String orderId) {
    return orderBenefitItemMapper.selectList(
      new LambdaQueryWrapper<OrderBenefitItemEntity>().eq(OrderBenefitItemEntity::getOrderId, orderId)
    );
  }

  private MiniOrderBenefitDto toBenefitDto(OrderBenefitItemEntity benefit) {
    return new MiniOrderBenefitDto(
      benefit.getId(),
      benefit.getKind(),
      benefit.getNameSnapshot(),
      zeroIfNull(benefit.getQuantity()),
      benefit.getUnitSnapshot()
    );
  }

  private MiniOrderItemDto toItemDto(OrderItemEntity item) {
    return new MiniOrderItemDto(
      item.getDishId(),
      item.getDishNameSnapshot(),
      item.getId(),
      zeroIfNull(item.getWeightJin())
    );
  }

  private MiniOrderShipmentDto toShipmentDto(OrderShipmentEntity shipment) {
    return new MiniOrderShipmentDto(
      shipment.getId(),
      shipment.getLogisticsNo(),
      shipment.getPackageName(),
      shipment.getPackageType(),
      shipment.getShippedAt(),
      shipment.getSignedAt(),
      shipment.getStatus(),
      shipment.getKuaidicom(),
      orderShipmentTrackingService.getTrackDto(shipment.getId())
    );
  }

  private Map<String, Object> parseAddressSnapshot(String raw) {
    if (!StringUtils.hasText(raw)) {
      return Map.of();
    }
    try {
      return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
    } catch (JsonProcessingException exception) {
      Map<String, Object> fallback = new LinkedHashMap<>();
      fallback.put("raw", raw);
      return fallback;
    }
  }

  private boolean isToday(LocalDateTime value) {
    if (value == null) {
      return false;
    }
    return value.toLocalDate().equals(LocalDate.now(BUSINESS_ZONE));
  }

  private String normalizeRequiredText(String value, String code, String message) {
    String normalized = normalizeNullableText(value);
    if (!StringUtils.hasText(normalized)) {
      throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private String normalizeNullableText(String value) {
    String normalized = value == null ? "" : value.trim();
    return StringUtils.hasText(normalized) ? normalized : null;
  }

  private BigDecimal zeroIfNull(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }
}
