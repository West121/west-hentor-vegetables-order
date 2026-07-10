package cn.hentor.vegetables.dto;

public record MiniLoginUserDto(
  String avatarUrl,
  String id,
  String phone,
  String nickname,
  String defaultStoreId,
  boolean profileIncomplete
) {}
