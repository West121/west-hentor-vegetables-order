package cn.hentor.vegetables.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record AdminOrderBatchShipRequest(
  @NotBlank String storeId,
  @Valid @NotEmpty List<AdminOrderBatchShipmentInput> shipments
) {}
