package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record DishInventoryLogDto(
  String id,
  BigDecimal beforeJin,
  BigDecimal changeJin,
  BigDecimal afterJin,
  String reason,
  String operatorId,
  String operatorName,
  String operatorUsername,
  LocalDateTime createdAt
) {}
