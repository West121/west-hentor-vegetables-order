package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public record TaskRequest(
  @NotBlank String cutoffTime,
  @NotEmpty List<String> dishIds,
  @NotNull LocalDateTime endsAt,
  @NotBlank String name,
  @NotNull LocalDateTime startsAt,
  @NotBlank String status,
  @NotBlank String storeId,
  String tag
) {}
