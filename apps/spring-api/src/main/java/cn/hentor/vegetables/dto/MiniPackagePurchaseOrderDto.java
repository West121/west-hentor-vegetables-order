package cn.hentor.vegetables.dto;

public record MiniPackagePurchaseOrderDto(
  Integer amountFen,
  String id,
  String payChannel,
  String status,
  String templateId
) {}
