package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MiniReservationItemDto(
  String dishId,
  String dishNameSnapshot,
  BigDecimal weightJin
) {}
