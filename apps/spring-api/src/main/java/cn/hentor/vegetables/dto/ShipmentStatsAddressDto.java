package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record ShipmentStatsAddressDto(
  String address,
  long orderCount,
  BigDecimal totalWeightJin
) {}
