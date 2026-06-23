package cn.hentor.vegetables.dto;

import jakarta.validation.constraints.NotBlank;

public record MiniAddressRequest(
  String city,
  @NotBlank(message = "请输入详细地址") String detail,
  String district,
  Boolean isDefault,
  String province,
  @NotBlank(message = "请输入收货人") String receiverName,
  @NotBlank(message = "请输入联系电话") String receiverPhone,
  String storeCode
) {}
