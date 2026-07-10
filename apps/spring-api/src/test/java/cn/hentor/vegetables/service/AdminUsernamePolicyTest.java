package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cn.hentor.vegetables.common.ApiException;
import org.junit.jupiter.api.Test;

class AdminUsernamePolicyTest {
  @Test
  void rejectsAnyWhitespaceForNewAccounts() {
    assertThatThrownBy(() -> AdminUsernamePolicy.normalizeForCreate("admin user"))
      .isInstanceOf(ApiException.class)
      .hasMessage("当前账号存在空格，请重新填写");
    assertThatThrownBy(() -> AdminUsernamePolicy.normalizeForCreate("admin\tuser"))
      .isInstanceOf(ApiException.class)
      .hasMessage("当前账号存在空格，请重新填写");
    assertThatThrownBy(() -> AdminUsernamePolicy.normalizeForCreate("admin　user"))
      .isInstanceOf(ApiException.class)
      .hasMessage("当前账号存在空格，请重新填写");
  }

  @Test
  void trimsEdgesButKeepsWhitespaceFreeAccount() {
    assertThat(AdminUsernamePolicy.normalizeForCreate("  admin_user  "))
      .isEqualTo("admin_user");
  }
}
