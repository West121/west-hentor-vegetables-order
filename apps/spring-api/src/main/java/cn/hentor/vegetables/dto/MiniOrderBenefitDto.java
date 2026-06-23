package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record MiniOrderBenefitDto(
  String id,
  String kind,
  String nameSnapshot,
  BigDecimal quantity,
  String unitSnapshot
) {}
