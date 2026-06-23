package cn.hentor.vegetables.dto;

import java.util.List;

public record MiniAddressListData(
  MiniAddressDto defaultAddress,
  List<MiniAddressDto> items
) {}
