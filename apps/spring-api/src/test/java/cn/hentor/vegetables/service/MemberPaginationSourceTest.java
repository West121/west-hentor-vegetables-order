package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class MemberPaginationSourceTest {
  @Test
  void memberPaginationUsesAUniqueTieBreakerAfterCreatedAt() throws Exception {
    String source = Files.readString(
      Path.of("src/main/java/cn/hentor/vegetables/service/MemberService.java")
    );

    assertThat(source).contains(
      ".orderByDesc(MemberStoreBindingEntity::getCreatedAt)\n" +
      "        .orderByDesc(MemberStoreBindingEntity::getId);"
    );
  }
}
