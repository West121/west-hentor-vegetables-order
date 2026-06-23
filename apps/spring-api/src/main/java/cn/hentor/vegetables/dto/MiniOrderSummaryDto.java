package cn.hentor.vegetables.dto;

public record MiniOrderSummaryDto(
  long canceled,
  long pendingShipment,
  long shipped,
  long signed,
  long total
) {}
