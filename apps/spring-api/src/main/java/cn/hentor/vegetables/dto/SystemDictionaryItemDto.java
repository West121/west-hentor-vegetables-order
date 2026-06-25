package cn.hentor.vegetables.dto;

public record SystemDictionaryItemDto(
  String code,
  Boolean enabled,
  String name,
  Integer sortOrder
) {}
