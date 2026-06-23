package cn.hentor.vegetables.dto;

public record StoreDto(
  String id,
  String code,
  String name,
  String status,
  String contactName,
  String contactPhone,
  String address,
  String cutoffTime
) {}
