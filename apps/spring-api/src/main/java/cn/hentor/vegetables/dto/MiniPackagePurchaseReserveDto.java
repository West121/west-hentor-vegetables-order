package cn.hentor.vegetables.dto;

import java.util.List;

public record MiniPackagePurchaseReserveDto(
  boolean enabled,
  String status,
  List<MiniPackageTemplateOptionDto> templates
) {}
