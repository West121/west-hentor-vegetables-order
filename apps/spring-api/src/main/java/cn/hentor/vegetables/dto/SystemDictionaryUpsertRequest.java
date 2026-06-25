package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record SystemDictionaryUpsertRequest(
  String code,
  String description,
  Boolean enabled,
  String name,
  Integer sortOrder,
  @NotBlank String storeId
) {}
