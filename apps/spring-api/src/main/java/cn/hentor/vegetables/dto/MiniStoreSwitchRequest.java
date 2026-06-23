package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record MiniStoreSwitchRequest(
  @NotBlank String storeId
) {}
