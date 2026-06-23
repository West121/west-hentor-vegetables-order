package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record AdminRolePermissionDto(
  String code,
  LocalDateTime createdAt,
  String id,
  String name
) {}
