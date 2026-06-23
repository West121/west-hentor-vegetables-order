package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record MemberRecentOrderDto(
  LocalDateTime createdAt,
  String id,
  List<MemberOrderItemDto> items,
  String orderNo,
  String status,
  BigDecimal totalWeightJin,
  LocalDateTime updatedAt,
  String userPackageId
) {}
