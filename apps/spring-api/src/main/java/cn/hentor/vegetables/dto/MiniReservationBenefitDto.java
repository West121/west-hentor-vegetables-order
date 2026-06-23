package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MiniReservationBenefitDto(
  String kind,
  String nameSnapshot,
  BigDecimal quantity,
  String unitSnapshot
) {}
