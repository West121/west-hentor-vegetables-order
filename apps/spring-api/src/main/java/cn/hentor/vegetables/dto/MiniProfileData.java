package cn.hentor.vegetables.dto;

import java.util.List;

public record MiniProfileData(
  MiniPackageDto currentPackage,
  MiniAddressDto defaultAddress,
  MiniMemberDto member,
  MiniOrderSummaryDto orderSummary,
  List<MiniOrderListItemDto> recentOrders,
  MiniStoreDto store
) {}
