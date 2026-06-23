package cn.hentor.vegetables.service;

import cn.hentor.vegetables.dto.MiniAddressDto;
import cn.hentor.vegetables.dto.MiniCurrentOrderBenefitDto;
import cn.hentor.vegetables.dto.MiniCurrentOrderDto;
import cn.hentor.vegetables.dto.MiniCurrentOrderItemDto;
import cn.hentor.vegetables.dto.MiniHomeData;
import cn.hentor.vegetables.dto.MiniHomeDishDto;
import cn.hentor.vegetables.dto.MiniMemberDto;
import cn.hentor.vegetables.dto.MiniPackageBenefitDto;
import cn.hentor.vegetables.dto.MiniPackageDto;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.dto.MiniTaskDto;
import cn.hentor.vegetables.dto.ReservationSummaryDto;
import cn.hentor.vegetables.entity.AddressEntity;
import cn.hentor.vegetables.entity.DishEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.OrderBenefitItemEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderItemEntity;
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
import cn.hentor.vegetables.mapper.OrderItemMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.TaskDishMapper;
import cn.hentor.vegetables.mapper.TaskMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import cn.hentor.vegetables.mapper.UserPackageBenefitMapper;
import cn.hentor.vegetables.mapper.UserPackageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class MiniHomeService {
  private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

  private final AddressMapper addressMapper;
  private final DishMapper dishMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final MiniAuthService miniAuthService;
  private final OrderBenefitItemMapper orderBenefitItemMapper;
  private final OrderItemMapper orderItemMapper;
  private final OrderMapper orderMapper;
  private final TaskDishMapper taskDishMapper;
  private final TaskMapper taskMapper;
  private final UserMapper userMapper;
  private final UserPackageBenefitMapper userPackageBenefitMapper;
  private final UserPackageMapper userPackageMapper;

  public MiniHomeService(
    AddressMapper addressMapper,
    DishMapper dishMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    MiniAuthService miniAuthService,
    OrderBenefitItemMapper orderBenefitItemMapper,
    OrderItemMapper orderItemMapper,
    OrderMapper orderMapper,
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
    this.orderBenefitItemMapper = orderBenefitItemMapper;
    this.orderItemMapper = orderItemMapper;
    this.orderMapper = orderMapper;
    this.taskDishMapper = taskDishMapper;
    this.taskMapper = taskMapper;
    this.userMapper = userMapper;
    this.userPackageBenefitMapper = userPackageBenefitMapper;
    this.userPackageMapper = userPackageMapper;
  }

  public MiniHomeData getHome(MiniSessionContext session, String storeCode, String orderId) {
    StoreEntity store = miniAuthService.findAvailableStore(storeCode);
    UserEntity user = userMapper.selectById(session.userId());
    MemberStoreBindingEntity binding = loadBinding(session.userId(), store.getId());
    MiniPackageDto packageInfo = loadCurrentPackage(session.userId(), store.getId());
    TaskEntity activeTask = loadActiveTask(store.getId());
    List<MiniHomeDishDto> dishes = loadDishes(store.getId(), activeTask);
    MiniCurrentOrderDto currentOrder = loadCurrentOrder(
      session.userId(),
      store.getId(),
      orderId,
      packageInfo == null ? BigDecimal.ZERO : packageInfo.weightLimitJin()
    );

    return new MiniHomeData(
      miniAuthService.toStoreDto(store),
      activeTask == null
        ? null
        : new MiniTaskDto(
          activeTask.getCutoffTime(),
          activeTask.getEndsAt(),
          activeTask.getId(),
          activeTask.getName(),
          activeTask.getStartsAt(),
          activeTask.getTag()
        ),
      packageInfo,
      binding == null || user == null
        ? null
        : new MiniMemberDto(
          binding.getStatus(),
          user.getDisabledReason(),
          user.getId(),
          user.getNickname(),
          user.getPhone(),
          user.getStatus()
        ),
      loadDefaultAddress(session.userId(), store.getId()),
      dishes,
      currentOrder
    );
  }

  private MemberStoreBindingEntity loadBinding(String userId, String storeId) {
    return memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, userId)
        .eq(MemberStoreBindingEntity::getStoreId, storeId)
        .last("limit 1")
    );
  }

  private MiniPackageDto loadCurrentPackage(String userId, String storeId) {
    List<UserPackageEntity> packages = userPackageMapper.selectList(
      new LambdaQueryWrapper<UserPackageEntity>()
        .eq(UserPackageEntity::getUserId, userId)
        .eq(UserPackageEntity::getStoreId, storeId)
        .apply("\"status\" in ('ACTIVE', 'FROZEN')")
        .orderByAsc(UserPackageEntity::getStatus)
        .orderByAsc(UserPackageEntity::getCreatedAt)
    );

    UserPackageEntity selected = packages
      .stream()
      .filter(item -> "ACTIVE".equals(item.getStatus()) && safeInt(item.getUsedTimes()) < safeInt(item.getTotalTimes()))
      .findFirst()
      .orElseGet(() -> packages
        .stream()
        .filter(item -> "ACTIVE".equals(item.getStatus()))
        .findFirst()
        .orElse(packages.isEmpty() ? null : packages.getFirst()));

    if (selected == null) {
      return null;
    }

    List<MiniPackageBenefitDto> benefits = userPackageBenefitMapper.selectList(
        new LambdaQueryWrapper<UserPackageBenefitEntity>()
          .eq(UserPackageBenefitEntity::getUserPackageId, selected.getId())
          .orderByAsc(UserPackageBenefitEntity::getSortOrder)
      )
      .stream()
      .map(this::toBenefitDto)
      .toList();

    int totalTimes = safeInt(selected.getTotalTimes());
    int usedTimes = safeInt(selected.getUsedTimes());
    return new MiniPackageDto(
      selected.getId(),
      selected.getStoreId(),
      selected.getUserId(),
      selected.getNameSnapshot(),
      totalTimes,
      usedTimes,
      Math.max(totalTimes - usedTimes, 0),
      selected.getStatus(),
      selected.getFrozenReason(),
      benefits,
      zeroIfNull(selected.getWeightLimitJin())
    );
  }

  private MiniPackageBenefitDto toBenefitDto(UserPackageBenefitEntity benefit) {
    BigDecimal total = zeroIfNull(benefit.getTotalQuantity());
    BigDecimal used = zeroIfNull(benefit.getUsedQuantity());
    return new MiniPackageBenefitDto(
      benefit.getId(),
      benefit.getKind(),
      benefit.getNameSnapshot(),
      total.subtract(used).max(BigDecimal.ZERO),
      benefit.getSortOrder(),
      total,
      benefit.getUnitSnapshot(),
      used
    );
  }

  private TaskEntity loadActiveTask(String storeId) {
    LocalDateTime now = LocalDateTime.now(BUSINESS_ZONE);
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

  private List<MiniHomeDishDto> loadDishes(String storeId, TaskEntity activeTask) {
    if (activeTask == null) {
      return dishMapper.selectList(
          new LambdaQueryWrapper<DishEntity>()
            .eq(DishEntity::getStoreId, storeId)
            .isNull(DishEntity::getDeletedAt)
            .apply("\"status\" = 'ON_SALE'")
            .orderByAsc(DishEntity::getSortOrder)
            .orderByAsc(DishEntity::getCreatedAt)
        )
        .stream()
        .map(this::toDishDto)
        .toList();
    }

    List<TaskDishEntity> taskDishes = taskDishMapper.selectList(
      new LambdaQueryWrapper<TaskDishEntity>()
        .eq(TaskDishEntity::getTaskId, activeTask.getId())
        .orderByAsc(TaskDishEntity::getSortOrder)
    );
    List<String> dishIds = taskDishes.stream().map(TaskDishEntity::getDishId).distinct().toList();
    if (dishIds.isEmpty()) {
      return List.of();
    }
    Map<String, Integer> sortOrderByDishId = taskDishes
      .stream()
      .collect(Collectors.toMap(TaskDishEntity::getDishId, TaskDishEntity::getSortOrder, Math::min));
    Map<String, DishEntity> dishById = dishMapper.selectList(
        new LambdaQueryWrapper<DishEntity>()
          .in(DishEntity::getId, dishIds)
          .eq(DishEntity::getStoreId, storeId)
          .isNull(DishEntity::getDeletedAt)
          .apply("\"status\" = 'ON_SALE'")
      )
      .stream()
      .collect(Collectors.toMap(DishEntity::getId, Function.identity()));

    return dishIds
      .stream()
      .map(dishById::get)
      .filter(java.util.Objects::nonNull)
      .sorted(Comparator.comparing(dish -> sortOrderByDishId.getOrDefault(dish.getId(), 0)))
      .map(this::toDishDto)
      .toList();
  }

  private MiniHomeDishDto toDishDto(DishEntity dish) {
    return new MiniHomeDishDto(
      dish.getId(),
      dish.getName(),
      dish.getCategory(),
      zeroIfNull(dish.getStepJin()),
      zeroIfNull(dish.getStockJin()),
      dish.getImageUrl(),
      dish.getDescription()
    );
  }

  private MiniAddressDto loadDefaultAddress(String userId, String storeId) {
    AddressEntity address = addressMapper.selectOne(
      new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getUserId, userId)
        .eq(AddressEntity::getStoreId, storeId)
        .eq(AddressEntity::getIsDefault, true)
        .orderByDesc(AddressEntity::getCreatedAt)
        .last("limit 1")
    );
    return address == null ? null : toAddressDto(address);
  }

  private MiniCurrentOrderDto loadCurrentOrder(
    String userId,
    String storeId,
    String orderId,
    BigDecimal weightLimitJin
  ) {
    LocalDate today = LocalDate.now(BUSINESS_ZONE);
    LambdaQueryWrapper<OrderEntity> wrapper = new LambdaQueryWrapper<OrderEntity>()
      .eq(OrderEntity::getUserId, userId)
      .eq(OrderEntity::getStoreId, storeId)
      .ge(OrderEntity::getCreatedAt, today.atStartOfDay())
      .lt(OrderEntity::getCreatedAt, today.plusDays(1).atStartOfDay())
      .isNull(OrderEntity::getDeletedByUserAt)
      .apply("\"status\" = 'PENDING_SHIPMENT'")
      .orderByDesc(OrderEntity::getCreatedAt)
      .last("limit 1");

    if (StringUtils.hasText(orderId)) {
      wrapper.eq(OrderEntity::getId, orderId.trim());
    }

    OrderEntity order = orderMapper.selectOne(wrapper);
    if (order == null) {
      return null;
    }

    List<MiniCurrentOrderItemDto> items = orderItemMapper.selectList(
        new LambdaQueryWrapper<OrderItemEntity>()
          .eq(OrderItemEntity::getOrderId, order.getId())
          .orderByAsc(OrderItemEntity::getId)
      )
      .stream()
      .map(item -> new MiniCurrentOrderItemDto(
        item.getDishId(),
        item.getId(),
        item.getDishNameSnapshot(),
        zeroIfNull(item.getWeightJin())
      ))
      .toList();

    List<MiniCurrentOrderBenefitDto> benefits = orderBenefitItemMapper.selectList(
        new LambdaQueryWrapper<OrderBenefitItemEntity>()
          .eq(OrderBenefitItemEntity::getOrderId, order.getId())
          .orderByAsc(OrderBenefitItemEntity::getId)
      )
      .stream()
      .map(benefit -> new MiniCurrentOrderBenefitDto(
        benefit.getId(),
        benefit.getKind(),
        benefit.getNameSnapshot(),
        zeroIfNull(benefit.getQuantity()),
        benefit.getUnitSnapshot(),
        benefit.getUserPackageBenefitId()
      ))
      .toList();

    BigDecimal totalWeight = items
      .stream()
      .map(MiniCurrentOrderItemDto::weightJin)
      .reduce(BigDecimal.ZERO, BigDecimal::add);
    ReservationSummaryDto summary = new ReservationSummaryDto(
      totalWeight,
      weightLimitJin.subtract(totalWeight).max(BigDecimal.ZERO),
      totalWeight.compareTo(weightLimitJin) > 0,
      items.size()
    );

    AddressEntity address = StringUtils.hasText(order.getAddressId())
      ? addressMapper.selectById(order.getAddressId())
      : null;

    return new MiniCurrentOrderDto(
      order.getId(),
      order.getOrderNo(),
      order.getAddressId(),
      order.getStatus(),
      zeroIfNull(order.getTotalWeightJin()),
      address == null ? null : toAddressDto(address),
      benefits,
      items,
      summary
    );
  }

  private MiniAddressDto toAddressDto(AddressEntity address) {
    return new MiniAddressDto(
      address.getCity(),
      address.getCreatedAt(),
      address.getDetail(),
      address.getDistrict(),
      fullAddress(address),
      address.getId(),
      address.getIsDefault(),
      address.getProvince(),
      address.getReceiverName(),
      address.getReceiverPhone(),
      address.getUpdatedAt()
    );
  }

  private String fullAddress(AddressEntity address) {
    List<String> parts = new ArrayList<>();
    if (StringUtils.hasText(address.getProvince())) {
      parts.add(address.getProvince().trim());
    }
    if (StringUtils.hasText(address.getCity())) {
      parts.add(address.getCity().trim());
    }
    if (StringUtils.hasText(address.getDistrict())) {
      parts.add(address.getDistrict().trim());
    }
    if (StringUtils.hasText(address.getDetail())) {
      parts.add(address.getDetail().trim());
    }
    return String.join(" ", parts);
  }

  private int safeInt(Integer value) {
    return value == null ? 0 : value;
  }

  private BigDecimal zeroIfNull(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }
}
