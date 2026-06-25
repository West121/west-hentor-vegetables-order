package cn.hentor.vegetables.dto;

import java.util.List;

public record SystemDictionaryListResponse(
  List<SystemDictionaryMetaDto> dictionaries
) {}
