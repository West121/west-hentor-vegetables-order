package cn.hentor.vegetables.dto;

public record MemberAddressRequest(
  String city,
  String detail,
  String district,
  String id,
  String province,
  String receiverName,
  String receiverPhone
) {}
