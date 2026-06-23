package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record MiniTaskDto(
  String cutoffTime,
  LocalDateTime endsAt,
  String id,
  String name,
  LocalDateTime startsAt,
  String tag
) {}
