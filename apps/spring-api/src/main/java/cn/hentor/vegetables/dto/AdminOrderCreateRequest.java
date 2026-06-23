package cn.hentor.vegetables.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminOrderCreateRequest(
  @NotBlank(message = "请选择配送地址") String addressId,
  @Valid List<MiniBenefitSelectionRequest> benefitSelections,
  @Size(max = 200, message = "内部备注最多 200 字") String internalRemark,
  @NotEmpty(message = "请选择菜品") @Valid List<MiniReservationItemRequest> items,
  @NotBlank(message = "请选择门店") String storeId,
  @NotBlank(message = "请选择会员") String userId,
  @NotBlank(message = "请选择套餐") String userPackageId,
  @Size(max = 200, message = "会员备注最多 200 字") String userVisibleRemark
) {}
