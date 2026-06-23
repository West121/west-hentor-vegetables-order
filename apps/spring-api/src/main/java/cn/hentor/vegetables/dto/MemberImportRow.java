package cn.hentor.vegetables.dto;

public record MemberImportRow(
  String disabledReason,
  String nickname,
  String phone,
  String remark,
  Integer rowNumber,
  String status
) {}
