package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record MemberAddressDto(
  String city,
  LocalDateTime createdAt,
  String detail,
  String district,
  String id,
  Boolean isDefault,
  String province,
  String receiverName,
  String receiverPhone,
  LocalDateTime updatedAt
) {}
