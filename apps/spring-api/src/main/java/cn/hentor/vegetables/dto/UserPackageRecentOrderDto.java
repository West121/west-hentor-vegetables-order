package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserPackageRecentOrderDto(
  LocalDateTime createdAt,
  String id,
  String orderNo,
  String status,
  BigDecimal totalWeightJin,
  LocalDateTime updatedAt
) {}
