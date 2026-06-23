package cn.hentor.vegetables.dto;

import java.util.List;

public record MemberImportResultDto(
  Integer createdBindings,
  Integer createdUsers,
  Integer failedRows,
  List<ImportFailureDto> failures,
  Integer importedRows,
  Integer totalRows,
  Integer updatedBindings,
  Integer updatedUsers
) {}
