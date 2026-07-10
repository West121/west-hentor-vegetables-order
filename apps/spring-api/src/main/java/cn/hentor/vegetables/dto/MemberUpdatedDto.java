package cn.hentor.vegetables.dto;

public record MemberUpdatedDto(
  String bindingStatus,
  MemberAddressDto defaultAddress,
  String disabledReason,
  String id,
  String nickname,
  String remark
) {}
