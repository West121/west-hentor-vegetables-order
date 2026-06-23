package cn.hentor.vegetables.dto;

import java.util.List;

public record AdminUserListResponse(
  List<AdminUserItemDto> items,
  PaginationDto pagination,
  AdminUserSummaryDto summary
) {}
