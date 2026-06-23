package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.util.List;

public record MiniReservationDto(
  List<MiniReservationBenefitDto> benefits,
  String id,
  List<MiniReservationItemDto> items,
  String orderNo,
  String status,
  BigDecimal totalWeightJin
) {}
