package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record TaskCancelRequest(@NotBlank String storeId) {}
