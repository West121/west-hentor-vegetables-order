package cn.hentor.vegetables.dto;

public record DishPaginationDto(
  long page,
  long pageSize,
  long total,
  long totalPages
) {}
