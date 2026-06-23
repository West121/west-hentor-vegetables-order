package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminRoleItemDto(
  String code,
  LocalDateTime createdAt,
  String id,
  String name,
  List<String> permissionCodes,
  List<AdminRolePermissionDto> permissions,
  LocalDateTime updatedAt,
  long userCount
) {}
