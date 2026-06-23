package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminUserItemDto(
  LocalDateTime createdAt,
  String id,
  LocalDateTime lastLoginAt,
  String name,
  String phone,
  List<String> roleIds,
  List<String> roleNames,
  String status,
  List<String> storeIds,
  List<String> storeNames,
  List<AdminUserStoreDto> stores,
  LocalDateTime updatedAt,
  String username
) {}
