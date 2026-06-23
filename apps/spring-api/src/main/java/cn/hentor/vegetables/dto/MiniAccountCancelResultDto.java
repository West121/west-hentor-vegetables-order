package cn.hentor.vegetables.dto;

public record MiniAccountCancelResultDto(
  String bindingStatus,
  String disabledReason,
  String status,
  String storeId,
  String userId
) {}
