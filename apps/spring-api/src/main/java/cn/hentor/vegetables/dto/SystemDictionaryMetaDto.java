package cn.hentor.vegetables.dto;

public record SystemDictionaryMetaDto(
  String code,
  Boolean builtIn,
  String description,
  Boolean enabled,
  String name,
  Integer sortOrder
) {}
