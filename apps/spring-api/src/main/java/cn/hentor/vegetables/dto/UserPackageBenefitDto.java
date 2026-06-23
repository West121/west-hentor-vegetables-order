package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record UserPackageBenefitDto(
  String id,
  String kind,
  String nameSnapshot,
  String shipmentGroup,
  Integer sortOrder,
  BigDecimal totalQuantity,
  String unitSnapshot,
  BigDecimal usedQuantity
) {}
