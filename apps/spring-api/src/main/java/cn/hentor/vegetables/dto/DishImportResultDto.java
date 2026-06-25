package cn.hentor.vegetables.dto;

import java.util.List;

public record DishImportResultDto(
  Integer createdDishes,
  Integer failedRows,
  List<ImportFailureDto> failures,
  Integer importedRows,
  Integer totalRows,
  Integer updatedDishes
) {}
