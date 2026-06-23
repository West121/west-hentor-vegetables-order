package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MemberDetailDto(
  Integer activePackageCount,
  List<MemberAddressDto> addresses,
  String avatarUrl,
  String bindingId,
  String bindingStatus,
  LocalDateTime createdAt,
  MemberAddressDto defaultAddress,
  String defaultStoreId,
  String disabledReason,
  String id,
  Boolean isDefaultBinding,
  MemberPackageDto latestActivePackage,
  String nickname,
  Integer orderCount,
  List<MemberPackageDto> packages,
  String phone,
  List<MemberRecentOrderDto> recentOrders,
  String remark,
  String source,
  String status,
  MemberStoreSummaryDto store,
  LocalDateTime updatedAt
) {}
