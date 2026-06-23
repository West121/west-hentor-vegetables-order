package cn.hentor.vegetables.dto;

import java.util.List;

public record AdminRoleListResponse(
  List<AdminRoleItemDto> items,
  PaginationDto pagination,
  AdminRoleSummaryDto summary
) {}
