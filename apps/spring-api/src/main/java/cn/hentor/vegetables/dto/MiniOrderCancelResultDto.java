package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record MiniOrderCancelResultDto(
  String cancelReason,
  LocalDateTime canceledAt,
  String id,
  String status
) {}
