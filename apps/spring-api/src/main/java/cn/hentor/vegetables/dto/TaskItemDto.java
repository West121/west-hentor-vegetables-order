package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TaskItemDto(
  String cutoffTime,
  LocalDateTime createdAt,
  int dishCount,
  List<TaskDishDto> dishes,
  LocalDateTime endsAt,
  String id,
  String name,
  LocalDateTime startsAt,
  String status,
  TaskStoreDto store,
  String tag,
  LocalDateTime updatedAt
) {}
