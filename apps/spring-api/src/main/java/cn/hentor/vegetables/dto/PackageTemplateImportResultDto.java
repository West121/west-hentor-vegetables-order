package cn.hentor.vegetables.dto;

import java.util.List;

public record PackageTemplateImportResultDto(
  Integer createdTemplates,
  Integer failedRows,
  List<ImportFailureDto> failures,
  Integer importedBenefits,
  Integer importedRows,
  Integer totalRows,
  Integer updatedTemplates
) {}
