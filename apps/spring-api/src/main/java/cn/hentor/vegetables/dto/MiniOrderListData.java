package cn.hentor.vegetables.dto;

import java.util.List;

public record MiniOrderListData(
  List<MiniOrderListItemDto> items,
  MiniOrderSummaryDto summary
) {}
