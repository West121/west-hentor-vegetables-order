package cn.hentor.vegetables.dto;

public record WechatLoginSessionDto(
  String openid,
  String unionid
) {}
