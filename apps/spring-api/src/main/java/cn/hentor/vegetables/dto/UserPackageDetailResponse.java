package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record UserPackageDetailResponse(
  String frozenReason,
  String id,
  String nameSnapshot,
  Integer remainingTimes,
  String status,
  Integer totalTimes,
  Integer usagePercent,
  Integer usedTimes,
  BigDecimal weightLimitJin,
  LocalDateTime createdAt,
  LocalDateTime lastUsedAt,
  LocalDateTime startsAt,
  LocalDateTime updatedAt,
  UserPackageUserDto user,
  UserPackageTemplateDto template,
  List<UserPackageBenefitDto> benefits,
  List<UserPackageRecentOrderDto> recentOrders,
  List<UserPackageOperationLogDto> operationLogs
) {}
