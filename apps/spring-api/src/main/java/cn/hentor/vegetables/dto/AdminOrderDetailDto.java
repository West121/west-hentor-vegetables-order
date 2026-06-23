package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record AdminOrderDetailDto(
  Map<String, String> addressSnapshot,
  List<AdminOrderBenefitItemDto> benefitItems,
  LocalDateTime canceledAt,
  String cancelReason,
  LocalDateTime createdAt,
  String id,
  String internalRemark,
  List<AdminOrderItemDto> items,
  String logisticsNo,
  LocalDateTime modifiedAt,
  String orderNo,
  LocalDateTime shippedAt,
  List<AdminOrderShipmentDto> shipments,
  LocalDateTime signedAt,
  String status,
  AdminOrderStoreDto store,
  BigDecimal totalWeightJin,
  LocalDateTime updatedAt,
  AdminOrderUserDto user,
  String userVisibleRemark,
  AdminOrderUserPackageDto userPackage
) {}
