package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record ShipmentStatsSummaryDto(
  long orderCount,
  BigDecimal totalWeightJin
) {}
