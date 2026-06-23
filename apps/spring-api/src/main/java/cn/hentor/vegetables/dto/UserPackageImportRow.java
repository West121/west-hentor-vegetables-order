package cn.hentor.vegetables.dto;

import java.math.BigDecimal;

public record UserPackageImportRow(
  String phone,
  String remark,
  Integer rowNumber,
  String status,
  String templateName,
  Integer totalTimes,
  Integer usedTimes,
  BigDecimal weightLimitJin
) {}
