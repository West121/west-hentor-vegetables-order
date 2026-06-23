package cn.hentor.vegetables.dto;

public record ImportFailureDto(
  String phone,
  String reason,
  Integer rowNumber,
  String templateName
) {}
