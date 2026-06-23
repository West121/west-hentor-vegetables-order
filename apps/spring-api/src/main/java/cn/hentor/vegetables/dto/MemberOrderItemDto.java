package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MemberOrderItemDto(
  String dishNameSnapshot,
  BigDecimal weightJin
) {}
