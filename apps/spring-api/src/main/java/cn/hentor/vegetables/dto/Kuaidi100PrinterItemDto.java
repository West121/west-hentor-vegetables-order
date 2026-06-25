package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record Kuaidi100PrinterItemDto(
  String apiKey,
  String apiSecret,
  String code,
  LocalDateTime createdAt,
  String expType,
  String id,
  boolean isDefault,
  String kuaidicom,
  String name,
  String partnerId,
  String partnerKey,
  String payType,
  String remark,
  Map<String, Object> requestParams,
  String senderCompany,
  String siid,
  int sortOrder,
  String status,
  String storeId,
  String tempId,
  LocalDateTime updatedAt
) {}
