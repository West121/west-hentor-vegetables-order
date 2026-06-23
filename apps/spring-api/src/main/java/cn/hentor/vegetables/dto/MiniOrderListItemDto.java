package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record MiniOrderListItemDto(
  Map<String, Object> addressSnapshot,
  boolean canEdit,
  LocalDateTime canceledAt,
  LocalDateTime createdAt,
  String id,
  List<MiniOrderBenefitDto> benefits,
  List<MiniOrderItemDto> items,
  String logisticsNo,
  List<MiniOrderShipmentDto> shipments,
  LocalDateTime modifiedAt,
  String orderNo,
  LocalDateTime shippedAt,
  LocalDateTime signedAt,
  String status,
  BigDecimal totalWeightJin,
  LocalDateTime updatedAt,
  MiniOrderPackageDto userPackage,
  String userVisibleRemark
) {}
