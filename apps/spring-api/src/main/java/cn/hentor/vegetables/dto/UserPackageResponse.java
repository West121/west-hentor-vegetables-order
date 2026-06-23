package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserPackageResponse(
  String frozenReason,
  String id,
  String nameSnapshot,
  Integer remainingTimes,
  String status,
  Integer totalTimes,
  Integer usagePercent,
  Integer usedTimes,
  String userId,
  BigDecimal weightLimitJin,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {}
