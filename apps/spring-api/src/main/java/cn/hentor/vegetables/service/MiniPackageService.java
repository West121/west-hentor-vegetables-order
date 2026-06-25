package cn.hentor.vegetables.service;

import cn.hentor.vegetables.dto.MiniOrderBenefitDto;
import cn.hentor.vegetables.dto.MiniOrderItemDto;
import cn.hentor.vegetables.dto.MiniPackageBenefitDto;
import cn.hentor.vegetables.dto.MiniPackageDto;
import cn.hentor.vegetables.dto.MiniPackagePurchaseReserveDto;
import cn.hentor.vegetables.dto.MiniPackageTemplateBenefitOptionDto;
import cn.hentor.vegetables.dto.MiniPackageTemplateOptionDto;
import cn.hentor.vegetables.dto.MiniPackageUsageDto;
import cn.hentor.vegetables.dto.MiniPackagesData;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.entity.OrderBenefitItemEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderItemEntity;
import cn.hentor.vegetables.entity.PackageTemplateBenefitEntity;
import cn.hentor.vegetables.entity.PackageTemplateEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserPackageBenefitEntity;
import cn.hentor.vegetables.entity.UserPackageEntity;
import cn.hentor.vegetables.mapper.OrderBenefitItemMapper;
import cn.hentor.vegetables.mapper.OrderItemMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.PackageTemplateBenefitMapper;
import cn.hentor.vegetables.mapper.PackageTemplateMapper;
import cn.hentor.vegetables.mapper.UserPackageBenefitMapper;
import cn.hentor.vegetables.mapper.UserPackageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class MiniPackageService {
  private final MiniAuthService miniAuthService;
  private final OrderBenefitItemMapper orderBenefitItemMapper;
  private final OrderItemMapper orderItemMapper;
  private final OrderMapper orderMapper;
  private final PackageTemplateBenefitMapper packageTemplateBenefitMapper;
  private final PackageTemplateMapper packageTemplateMapper;
  private final UserPackageBenefitMapper userPackageBenefitMapper;
  private final UserPackageMapper userPackageMapper;

  public MiniPackageService(
    MiniAuthService miniAuthService,
    OrderBenefitItemMapper orderBenefitItemMapper,
    OrderItemMapper orderItemMapper,
    OrderMapper orderMapper,
    PackageTemplateBenefitMapper packageTemplateBenefitMapper,
    PackageTemplateMapper packageTemplateMapper,
    UserPackageBenefitMapper userPackageBenefitMapper,
    UserPackageMapper userPackageMapper
  ) {
    this.miniAuthService = miniAuthService;
    this.orderBenefitItemMapper = orderBenefitItemMapper;
    this.orderItemMapper = orderItemMapper;
    this.orderMapper = orderMapper;
    this.packageTemplateBenefitMapper = packageTemplateBenefitMapper;
    this.packageTemplateMapper = packageTemplateMapper;
    this.userPackageBenefitMapper = userPackageBenefitMapper;
    this.userPackageMapper = userPackageMapper;
  }

  public MiniPackagesData listPackages(MiniSessionContext session, String storeCode) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), storeCode);
    return new MiniPackagesData(
      listPackageDtos(session.userId(), store.getId()),
      new MiniPackagePurchaseReserveDto(false, "PAYMENT_NOT_ENABLED", listPurchaseTemplates(store.getId()))
    );
  }

  public MiniPackageDto getCurrentPackage(String userId, String storeId) {
    List<MiniPackageDto> packages = listPackageDtos(userId, storeId);
    return packages
      .stream()
      .filter(item -> "ACTIVE".equals(item.status()) && safeInt(item.remainingTimes()) > 0)
      .findFirst()
      .orElseGet(() -> packages
        .stream()
        .filter(item -> "ACTIVE".equals(item.status()))
        .findFirst()
        .orElse(packages.isEmpty() ? null : packages.getFirst()));
  }

  public MiniPackageDto getFirstCreatedPackage(String userId, String storeId) {
    List<MiniPackageDto> packages = listPackageDtos(userId, storeId);
    return packages.isEmpty() ? null : packages.getFirst();
  }

  public List<MiniPackageDto> listPackageDtos(String userId, String storeId) {
    List<UserPackageEntity> packages = userPackageMapper.selectList(
      new LambdaQueryWrapper<UserPackageEntity>()
        .eq(UserPackageEntity::getUserId, userId)
        .eq(UserPackageEntity::getStoreId, storeId)
        .orderByAsc(UserPackageEntity::getCreatedAt)
        .orderByAsc(UserPackageEntity::getId)
    );
    if (packages.isEmpty()) {
      return List.of();
    }

    Map<String, List<UserPackageBenefitEntity>> benefitsByPackageId =
      userPackageBenefitMapper.selectList(
          new LambdaQueryWrapper<UserPackageBenefitEntity>()
            .in(UserPackageBenefitEntity::getUserPackageId, packages.stream().map(UserPackageEntity::getId).toList())
            .orderByAsc(UserPackageBenefitEntity::getSortOrder)
        )
        .stream()
        .collect(Collectors.groupingBy(UserPackageBenefitEntity::getUserPackageId));
    List<OrderEntity> orders = orderMapper.selectList(
        new LambdaQueryWrapper<OrderEntity>()
          .eq(OrderEntity::getStoreId, storeId)
          .eq(OrderEntity::getUserId, userId)
          .in(OrderEntity::getUserPackageId, packages.stream().map(UserPackageEntity::getId).toList())
          .isNull(OrderEntity::getDeletedByUserAt)
          .notIn(OrderEntity::getStatus, "CANCELED", "VOIDED")
          .orderByDesc(OrderEntity::getCreatedAt)
      );
    Map<String, List<OrderEntity>> ordersByPackageId = orders
      .stream()
      .collect(Collectors.groupingBy(OrderEntity::getUserPackageId));
    List<String> orderIds = orders.stream().map(OrderEntity::getId).toList();
    Map<String, List<OrderItemEntity>> itemsByOrderId = orderIds.isEmpty()
      ? Map.of()
      : orderItemMapper.selectList(
          new LambdaQueryWrapper<OrderItemEntity>()
            .in(OrderItemEntity::getOrderId, orderIds)
            .orderByAsc(OrderItemEntity::getId)
        )
        .stream()
        .collect(Collectors.groupingBy(OrderItemEntity::getOrderId));
    Map<String, List<OrderBenefitItemEntity>> orderBenefitsByOrderId = orderIds.isEmpty()
      ? Map.of()
      : orderBenefitItemMapper.selectList(
          new LambdaQueryWrapper<OrderBenefitItemEntity>()
            .in(OrderBenefitItemEntity::getOrderId, orderIds)
            .orderByAsc(OrderBenefitItemEntity::getId)
        )
        .stream()
        .collect(Collectors.groupingBy(OrderBenefitItemEntity::getOrderId));

    return packages
      .stream()
      .map(item -> toPackageDto(
        item,
        benefitsByPackageId.getOrDefault(item.getId(), List.of()),
        ordersByPackageId.getOrDefault(item.getId(), List.of()),
        itemsByOrderId,
        orderBenefitsByOrderId
      ))
      .toList();
  }

  private List<MiniPackageTemplateOptionDto> listPurchaseTemplates(String storeId) {
    List<PackageTemplateEntity> templates = packageTemplateMapper.selectList(
      new LambdaQueryWrapper<PackageTemplateEntity>()
        .eq(PackageTemplateEntity::getStoreId, storeId)
        .apply("\"status\" = 'ACTIVE'")
        .orderByAsc(PackageTemplateEntity::getSortOrder)
        .orderByAsc(PackageTemplateEntity::getCreatedAt)
    );
    if (templates.isEmpty()) {
      return List.of();
    }

    Map<String, List<PackageTemplateBenefitEntity>> benefitsByTemplateId =
      packageTemplateBenefitMapper.selectList(
          new LambdaQueryWrapper<PackageTemplateBenefitEntity>()
            .in(PackageTemplateBenefitEntity::getTemplateId, templates.stream().map(PackageTemplateEntity::getId).toList())
            .orderByAsc(PackageTemplateBenefitEntity::getSortOrder)
        )
        .stream()
        .collect(Collectors.groupingBy(PackageTemplateBenefitEntity::getTemplateId));

    return templates
      .stream()
      .map(template -> new MiniPackageTemplateOptionDto(
        benefitsByTemplateId.getOrDefault(template.getId(), List.of())
          .stream()
          .sorted(Comparator.comparing(benefit -> safeInt(benefit.getSortOrder())))
          .map(benefit -> new MiniPackageTemplateBenefitOptionDto(
            benefit.getId(),
            benefit.getKind(),
            benefit.getName(),
            zeroIfNull(benefit.getTotalQuantity()),
            benefit.getUnit()
          ))
          .toList(),
        template.getId(),
        template.getName(),
        template.getTotalTimes(),
        zeroIfNull(template.getWeightLimitJin())
      ))
      .toList();
  }

  private MiniPackageDto toPackageDto(
    UserPackageEntity item,
    List<UserPackageBenefitEntity> benefits,
    List<OrderEntity> orders,
    Map<String, List<OrderItemEntity>> itemsByOrderId,
    Map<String, List<OrderBenefitItemEntity>> orderBenefitsByOrderId
  ) {
    int totalTimes = safeInt(item.getTotalTimes());
    int usedTimes = safeInt(item.getUsedTimes());
    return new MiniPackageDto(
      item.getId(),
      item.getStoreId(),
      item.getUserId(),
      item.getNameSnapshot(),
      totalTimes,
      usedTimes,
      Math.max(totalTimes - usedTimes, 0),
      item.getStatus(),
      item.getFrozenReason(),
      benefits.stream().map(this::toBenefitDto).toList(),
      orders
        .stream()
        .limit(8)
        .map(order -> toUsageDto(
          order,
          itemsByOrderId.getOrDefault(order.getId(), List.of()),
          orderBenefitsByOrderId.getOrDefault(order.getId(), List.of())
        ))
        .toList(),
      zeroIfNull(item.getWeightLimitJin())
    );
  }

  private MiniPackageUsageDto toUsageDto(
    OrderEntity order,
    List<OrderItemEntity> orderItems,
    List<OrderBenefitItemEntity> orderBenefits
  ) {
    return new MiniPackageUsageDto(
      order.getCreatedAt(),
      orderBenefits.stream().map(this::toOrderBenefitDto).toList(),
      order.getId(),
      orderItems.stream().map(this::toOrderItemDto).toList(),
      order.getOrderNo(),
      order.getStatus(),
      zeroIfNull(order.getTotalWeightJin())
    );
  }

  private MiniOrderBenefitDto toOrderBenefitDto(OrderBenefitItemEntity benefit) {
    return new MiniOrderBenefitDto(
      benefit.getId(),
      benefit.getKind(),
      benefit.getNameSnapshot(),
      zeroIfNull(benefit.getQuantity()),
      benefit.getUnitSnapshot()
    );
  }

  private MiniOrderItemDto toOrderItemDto(OrderItemEntity item) {
    return new MiniOrderItemDto(
      item.getDishId(),
      item.getDishNameSnapshot(),
      item.getId(),
      zeroIfNull(item.getWeightJin())
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

  private int safeInt(Integer value) {
    return value == null ? 0 : value;
  }

  private BigDecimal zeroIfNull(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }
}
