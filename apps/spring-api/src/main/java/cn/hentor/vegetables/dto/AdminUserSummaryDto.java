package cn.hentor.vegetables.dto;

public record AdminUserSummaryDto(
  long active,
  long disabled,
  long total
) {}
