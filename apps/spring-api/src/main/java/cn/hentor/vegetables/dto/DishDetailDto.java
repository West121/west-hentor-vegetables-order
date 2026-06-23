package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DishDetailDto(
  String id,
  String name,
  String category,
  String status,
  java.math.BigDecimal stepJin,
  java.math.BigDecimal stockJin,
  String imageKey,
  String imageUrl,
  String description,
  Integer sortOrder,
  LocalDateTime createdAt,
  LocalDateTime updatedAt,
  LocalDateTime deletedAt,
  List<DishInventoryLogDto> inventoryLogs
) {}
