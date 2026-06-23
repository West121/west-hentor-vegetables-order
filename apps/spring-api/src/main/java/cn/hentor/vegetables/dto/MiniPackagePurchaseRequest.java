package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record MiniPackagePurchaseRequest(
  String storeCode,
  @NotBlank String templateId
) {}
