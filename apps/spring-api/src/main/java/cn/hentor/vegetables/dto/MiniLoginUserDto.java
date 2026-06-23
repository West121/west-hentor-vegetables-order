package cn.hentor.vegetables.dto;

public record MiniLoginUserDto(
  String id,
  String phone,
  String nickname,
  String defaultStoreId
) {}
