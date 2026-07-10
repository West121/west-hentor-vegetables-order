package cn.hentor.vegetables.common;

import java.util.List;

public record PageResult<T>(
  List<T> items,
  long page,
  long pageSize,
  long total,
  long totalPages,
  Object summary
) {
  public PageResult(
    List<T> items,
    long page,
    long pageSize,
    long total,
    long totalPages
  ) {
    this(items, page, pageSize, total, totalPages, null);
  }
}
