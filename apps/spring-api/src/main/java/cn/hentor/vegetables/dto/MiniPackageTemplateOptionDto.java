package cn.hentor.vegetables.dto;

import java.math.BigDecimal;
import java.util.List;

public record MiniPackageTemplateOptionDto(
  List<MiniPackageTemplateBenefitOptionDto> benefits,
  String id,
  String name,
  Integer totalTimes,
  BigDecimal weightLimitJin
) {}
