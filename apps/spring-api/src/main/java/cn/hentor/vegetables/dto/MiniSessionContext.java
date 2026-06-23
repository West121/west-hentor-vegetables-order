package cn.hentor.vegetables.dto;

public record MiniSessionContext(
  String token,
  String userId,
  String openid,
  String storeId
) {}
