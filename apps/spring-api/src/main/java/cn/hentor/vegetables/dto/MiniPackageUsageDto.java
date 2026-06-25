package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record MiniPackageUsageDto(
  LocalDateTime createdAt,
  List<MiniOrderBenefitDto> benefits,
  String id,
  List<MiniOrderItemDto> items,
  String orderNo,
  String status,
  BigDecimal totalWeightJin
) {}
