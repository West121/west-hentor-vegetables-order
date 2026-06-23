package cn.hentor.vegetables.dto;

public record MiniMemberStoreDto(
  String code,
  String customerServiceTel,
  String id,
  boolean isCurrent,
  boolean isDefault,
  String name,
  String type
) {}
