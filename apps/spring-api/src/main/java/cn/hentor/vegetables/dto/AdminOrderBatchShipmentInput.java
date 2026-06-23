package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminOrderBatchShipmentInput(
  @NotBlank String logisticsNo,
  @NotBlank String orderId
) {}
