package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminOrderShipmentInput(
  @NotBlank String logisticsNo,
  @NotBlank String packageName,
  String packageType
) {}
