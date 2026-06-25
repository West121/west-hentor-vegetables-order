package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record DishImportRow(
  String category,
  String description,
  String name,
  Integer rowNumber,
  Integer sortOrder,
  String status,
  BigDecimal stepJin,
  BigDecimal stockJin
) {}
