package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record DishSummaryDto(
  long lowStock,
  long offSale,
  long onSale,
  BigDecimal stock,
  long total
) {}
