package cn.hentor.vegetables.common;

import java.util.List;

public record PageResult<T>(
  List<T> items,
  long page,
  long pageSize,
  long total,
  long totalPages
) {}
