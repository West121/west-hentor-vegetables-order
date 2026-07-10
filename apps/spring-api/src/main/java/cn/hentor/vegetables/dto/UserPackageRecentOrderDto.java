package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record UserPackageRecentOrderDto(
  LocalDateTime createdAt,
  String id,
  List<AdminOrderItemDto> items,
  String orderNo,
  String status,
  BigDecimal totalWeightJin,
  LocalDateTime updatedAt
) {}
