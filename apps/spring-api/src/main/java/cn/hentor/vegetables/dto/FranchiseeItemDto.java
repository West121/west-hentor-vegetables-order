package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record FranchiseeItemDto(
  String contactName,
  String contactPhone,
  LocalDateTime contractEndsAt,
  LocalDateTime createdAt,
  String id,
  String name,
  String remark,
  String status,
  long storeCount,
  List<FranchiseeStoreDto> stores,
  LocalDateTime updatedAt
) {}
