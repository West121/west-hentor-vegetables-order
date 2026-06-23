package cn.hentor.vegetables.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record AdminOrderShipRequest(
  String logisticsNo,
  @Valid List<AdminOrderShipmentInput> shipments,
  @NotBlank String storeId
) {}
