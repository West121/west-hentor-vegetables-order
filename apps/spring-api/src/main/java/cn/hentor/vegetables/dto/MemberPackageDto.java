package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MemberPackageDto(
  LocalDateTime createdAt,
  String frozenReason,
  String id,
  LocalDateTime lastUsedAt,
  String nameSnapshot,
  Integer remainingTimes,
  String status,
  MemberPackageTemplateDto template,
  Integer totalTimes,
  LocalDateTime updatedAt,
  Integer usedTimes,
  BigDecimal weightLimitJin
) {}
