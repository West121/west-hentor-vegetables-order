package cn.hentor.vegetables.dto;

import java.util.List;

public record Kuaidi100PrinterListResponse(
  List<Kuaidi100PrinterItemDto> items,
  PaginationDto pagination,
  Kuaidi100PrinterSummaryDto summary
) {}
