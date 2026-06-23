package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record AdminOrderBatchShipSuccessDto(
  String logisticsNo,
  String orderId,
  LocalDateTime shippedAt,
  String status
) {}
