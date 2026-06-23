package cn.hentor.vegetables.dto;

public record MiniStoreSwitchResponse(
  MiniMemberStoreDto store,
  String token
) {}
