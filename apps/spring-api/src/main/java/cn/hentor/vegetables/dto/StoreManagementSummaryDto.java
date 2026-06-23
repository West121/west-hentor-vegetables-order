package cn.hentor.vegetables.dto;

public record StoreManagementSummaryDto(
  long active,
  long direct,
  long disabled,
  long franchise,
  long total
) {}
