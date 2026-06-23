package cn.hentor.vegetables.dto;

public record Kuaidi100PrintFailureDto(
  String message,
  String orderNo,
  String packageName,
  String shipmentId
) {}
