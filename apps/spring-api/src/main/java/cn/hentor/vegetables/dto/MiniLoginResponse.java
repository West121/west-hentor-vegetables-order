package cn.hentor.vegetables.dto;

public record MiniLoginResponse(
  String token,
  MiniLoginUserDto user,
  MiniStoreDto store
) {}
