package cn.hentor.vegetables.dto;

public record MiniStoreDto(
  String id,
  String code,
  String name,
  String cutoffTime,
  String customerServiceTel
) {}
