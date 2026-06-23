package cn.hentor.vegetables.dto;

public record Kuaidi100PrintTaskDto(
  String cargo,
  String count,
  String orderId,
  String orderNo,
  String packageName,
  String packageType,
  String receiverAddress,
  String receiverMobile,
  String receiverName,
  String remark,
  String senderAddress,
  String senderMobile,
  String senderName,
  String shipmentId,
  String weightKg
) {}
