package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record DishDto(
  String id,
  String name,
  String category,
  String status,
  BigDecimal stepJin,
  BigDecimal stockJin,
  String imageKey,
  String imageUrl,
  String description,
  Integer sortOrder,
  LocalDateTime createdAt,
  LocalDateTime updatedAt,
  LocalDateTime deletedAt
) {}
