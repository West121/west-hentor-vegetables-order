package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public record TaskCopyRequest(
  @NotBlank String cutoffTime,
  List<TaskDishInputDto> dishes,
  List<String> dishIds,
  @NotNull LocalDateTime endsAt,
  @NotBlank String name,
  @NotNull LocalDateTime startsAt,
  @NotBlank String storeId,
  String tag
) {}
