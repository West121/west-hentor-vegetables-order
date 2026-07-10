package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record MiniOrderShipmentDto(
  String id,
  String logisticsNo,
  String packageName,
  String packageType,
  LocalDateTime shippedAt,
  LocalDateTime signedAt,
  String status,
  String kuaidicom,
  OrderShipmentTrackDto track
) {}
