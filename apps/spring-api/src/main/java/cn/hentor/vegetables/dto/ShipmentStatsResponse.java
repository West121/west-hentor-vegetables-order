package cn.hentor.vegetables.dto;

import java.util.List;

public record ShipmentStatsResponse(
  List<ShipmentStatsAddressDto> addresses,
  String copyText,
  String csvText,
  List<ShipmentStatsDishDto> dishes,
  ShipmentStatsSummaryDto summary
) {}
