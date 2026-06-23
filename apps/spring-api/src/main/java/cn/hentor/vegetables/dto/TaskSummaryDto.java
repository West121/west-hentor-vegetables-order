package cn.hentor.vegetables.dto;

public record TaskSummaryDto(
  long active,
  long disabled,
  long draft,
  long total
) {}
