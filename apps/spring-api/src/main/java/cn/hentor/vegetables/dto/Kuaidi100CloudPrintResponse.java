package cn.hentor.vegetables.dto;

import java.util.List;

public record Kuaidi100CloudPrintResponse(
  int failureCount,
  List<Kuaidi100PrintFailureDto> failures,
  int successCount,
  List<Kuaidi100PrintUpdatedDto> updated
) {}
