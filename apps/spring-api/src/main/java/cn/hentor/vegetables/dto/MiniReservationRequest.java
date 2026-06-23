package cn.hentor.vegetables.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record MiniReservationRequest(
  @NotBlank(message = "请选择配送地址") String addressId,
  @Valid List<MiniBenefitSelectionRequest> benefitSelections,
  @NotEmpty(message = "请选择菜品") @Valid List<MiniReservationItemRequest> items,
  String orderId,
  String storeCode,
  @NotBlank(message = "请选择套餐") String userPackageId,
  @Size(max = 200, message = "备注最多 200 字") String userVisibleRemark
) {}
