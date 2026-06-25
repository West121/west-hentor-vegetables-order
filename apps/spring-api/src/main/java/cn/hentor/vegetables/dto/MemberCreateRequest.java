package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MemberCreateRequest(
  MemberAddressRequest defaultAddress,
  String disabledReason,
  String nickname,
  @NotBlank(message = "手机号不能为空") String phone,
  String remark,
  @NotNull(message = "会员状态不能为空") String status,
  @NotBlank(message = "门店不能为空") String storeId
) {}
