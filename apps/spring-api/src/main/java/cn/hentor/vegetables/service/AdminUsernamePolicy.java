package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import org.springframework.http.HttpStatus;

final class AdminUsernamePolicy {
  private AdminUsernamePolicy() {}

  static String normalizeForCreate(String username) {
    String normalized = username == null ? "" : username.trim();
    if (normalized.isEmpty()) {
      throw new ApiException("USERNAME_REQUIRED", "请输入登录账号", HttpStatus.BAD_REQUEST);
    }
    if (normalized.codePoints().anyMatch(codePoint ->
      Character.isWhitespace(codePoint) || Character.isSpaceChar(codePoint)
    )) {
      throw new ApiException(
        "USERNAME_WHITESPACE",
        "当前账号存在空格，请重新填写",
        HttpStatus.BAD_REQUEST
      );
    }
    return normalized;
  }
}
