package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record AdminOrderShipmentDto(
  String id,
  String logisticsNo,
  String packageName,
  String packageType,
  LocalDateTime shippedAt,
  String status,
  String kuaidicom,
  OrderShipmentTrackDto track
) {}
