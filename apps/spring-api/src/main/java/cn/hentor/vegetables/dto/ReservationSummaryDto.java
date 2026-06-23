package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record ReservationSummaryDto(
  BigDecimal totalWeightJin,
  BigDecimal remainingWeightJin,
  boolean isOverLimit,
  int itemCount
) {}
