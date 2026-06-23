package cn.hentor.vegetables.dto;

import java.util.List;

public record StoreManagementListResponse(
  List<StoreManagementItemDto> stores,
  PaginationDto pagination,
  StoreManagementSummaryDto summary
) {}
