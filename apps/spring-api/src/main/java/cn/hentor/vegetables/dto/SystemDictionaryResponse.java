package cn.hentor.vegetables.dto;

import java.util.List;

public record SystemDictionaryResponse(
  SystemDictionaryMetaDto dictionary,
  List<SystemDictionaryItemDto> items,
  String type
) {}
