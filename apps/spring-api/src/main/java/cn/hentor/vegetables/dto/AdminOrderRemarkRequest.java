package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminOrderRemarkRequest(
  String internalRemark,
  @NotBlank String storeId
) {}
