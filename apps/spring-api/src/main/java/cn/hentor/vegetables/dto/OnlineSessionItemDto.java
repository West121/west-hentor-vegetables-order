package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record OnlineSessionItemDto(
  boolean current,
  String displayName,
  LocalDateTime expiresAt,
  String id,
  String phone,
  String storeName,
  String type,
  String typeLabel,
  String userId,
  String username
) {}
