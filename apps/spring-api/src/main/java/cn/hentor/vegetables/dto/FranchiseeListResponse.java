package cn.hentor.vegetables.dto;

import java.util.List;

public record FranchiseeListResponse(
  List<FranchiseeItemDto> items,
  PaginationDto pagination,
  FranchiseeSummaryDto summary
) {}
