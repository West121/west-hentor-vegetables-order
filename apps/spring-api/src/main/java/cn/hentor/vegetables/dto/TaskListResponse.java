package cn.hentor.vegetables.dto;

import java.util.List;

public record TaskListResponse(
  List<TaskItemDto> items,
  PaginationDto pagination,
  TaskSummaryDto summary
) {}
