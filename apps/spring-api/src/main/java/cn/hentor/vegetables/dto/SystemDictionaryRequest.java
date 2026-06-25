package cn.hentor.vegetables.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record SystemDictionaryRequest(
  String description,
  Boolean enabled,
  @Valid List<SystemDictionaryItemDto> items,
  String name,
  Integer sortOrder,
  @NotBlank String storeId
) {}
