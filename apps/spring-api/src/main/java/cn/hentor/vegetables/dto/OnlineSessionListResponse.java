package cn.hentor.vegetables.dto;

import java.util.List;

public record OnlineSessionListResponse(
  List<OnlineSessionItemDto> items,
  OnlineSessionSummaryDto summary
) {}
