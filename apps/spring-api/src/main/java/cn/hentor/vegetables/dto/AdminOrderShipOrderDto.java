package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminOrderShipOrderDto(
  String id,
  String logisticsNo,
  LocalDateTime shippedAt,
  List<AdminOrderShipmentDto> shipments,
  String status
) {}
