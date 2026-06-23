package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record AdminOrderStatusResultDto(
  LocalDateTime canceledAt,
  String cancelReason,
  String id,
  LocalDateTime signedAt,
  String status
) {}
