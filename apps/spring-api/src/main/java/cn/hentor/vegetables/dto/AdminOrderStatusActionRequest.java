package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminOrderStatusActionRequest(
  String reason,
  @NotBlank String storeId
) {}
