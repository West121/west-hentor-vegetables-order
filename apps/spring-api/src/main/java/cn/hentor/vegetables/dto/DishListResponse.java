package cn.hentor.vegetables.dto;

import java.util.List;

public record DishListResponse(
  List<DishDto> items,
  DishPaginationDto pagination,
  DishSummaryDto summary
) {}
