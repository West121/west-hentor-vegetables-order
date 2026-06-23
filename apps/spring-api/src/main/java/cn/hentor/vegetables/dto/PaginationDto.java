package cn.hentor.vegetables.dto;

public record PaginationDto(
  long page,
  long pageSize,
  long total,
  long totalPages
) {}
