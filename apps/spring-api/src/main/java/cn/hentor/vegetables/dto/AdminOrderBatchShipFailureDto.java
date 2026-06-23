package cn.hentor.vegetables.dto;

public record AdminOrderBatchShipFailureDto(
  String code,
  String logisticsNo,
  String message,
  String orderId
) {}
