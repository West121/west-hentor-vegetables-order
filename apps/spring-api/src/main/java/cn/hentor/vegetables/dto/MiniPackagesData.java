package cn.hentor.vegetables.dto;

import java.util.List;

public record MiniPackagesData(
  List<MiniPackageDto> items,
  MiniPackagePurchaseReserveDto purchaseReserve
) {}
