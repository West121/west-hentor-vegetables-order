package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record UserPackageOperationLogDto(
  String afterValue,
  String beforeValue,
  LocalDateTime createdAt,
  String id,
  String operatorId,
  String operatorName,
  String operatorUsername,
  String reason
) {}
