package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.util.List;

public record MiniCurrentOrderDto(
  String id,
  String orderNo,
  String addressId,
  String status,
  BigDecimal totalWeightJin,
  MiniAddressDto address,
  List<MiniCurrentOrderBenefitDto> benefits,
  List<MiniCurrentOrderItemDto> items,
  ReservationSummaryDto summary
) {}
