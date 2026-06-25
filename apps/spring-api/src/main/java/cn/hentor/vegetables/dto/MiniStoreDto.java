package cn.hentor.vegetables.dto;

import java.util.List;

public record MiniStoreDto(
  String id,
  String code,
  String name,
  String cutoffTime,
  String customerServiceTel,
  List<String> deliveryCities,
  List<String> deliveryProvinces,
  Integer homeDishColumns
) {}
