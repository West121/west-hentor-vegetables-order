package cn.hentor.vegetables.dto;

import java.util.List;

public record MiniStoreListData(
  MiniMemberStoreDto currentStore,
  List<MiniMemberStoreDto> stores
) {}
