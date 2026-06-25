package cn.hentor.vegetables.dto;

public record MiniMemberDto(
  String avatarUrl,
  String bindingStatus,
  String disabledReason,
  String id,
  String nickname,
  String phone,
  String status
) {}
