package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record UserPackageImportRow(
  String address,
  String city,
  String detail,
  String district,
  String nickname,
  String phone,
  String province,
  String receiverName,
  String receiverPhone,
  String remark,
  Integer rowNumber,
  String status,
  String templateName,
  Integer totalTimes,
  Integer usedTimes,
  BigDecimal weightLimitJin
) {}
