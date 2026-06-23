package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.util.List;

public record MiniPackageDto(
  String id,
  String storeId,
  String userId,
  String nameSnapshot,
  Integer totalTimes,
  Integer usedTimes,
  Integer remainingTimes,
  String status,
  String frozenReason,
  List<MiniPackageBenefitDto> benefits,
  BigDecimal weightLimitJin
) {}
