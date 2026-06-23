package cn.hentor.vegetables.dto;

public record FranchiseeSummaryDto(
  long active,
  long expired,
  long suspended,
  long total
) {}
