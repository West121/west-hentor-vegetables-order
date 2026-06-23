package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminSessionDto(
  String token,
  String adminUserId,
  String username,
  String name,
  String phone,
  List<AdminRoleDto> roles,
  List<String> permissionCodes,
  List<StoreDto> stores,
  String storeScope,
  LocalDateTime expiresAt
) {}
