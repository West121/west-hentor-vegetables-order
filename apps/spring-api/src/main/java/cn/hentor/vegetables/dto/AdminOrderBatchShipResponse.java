package cn.hentor.vegetables.dto;

import java.util.List;

public record AdminOrderBatchShipResponse(
  int failureCount,
  List<AdminOrderBatchShipFailureDto> failures,
  int successCount,
  List<AdminOrderBatchShipSuccessDto> successes
) {}
