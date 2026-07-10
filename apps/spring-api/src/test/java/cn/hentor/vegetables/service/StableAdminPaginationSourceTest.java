package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class StableAdminPaginationSourceTest {
  private static String source(String file) throws Exception {
    return Files.readString(Path.of("src/main/java/cn/hentor/vegetables/" + file));
  }

  private static void assertCreatedAtThenId(String source, String entity) {
    assertThat(source).containsPattern(
      "\\.orderByDesc\\(" + entity + "::getCreatedAt\\)\\s*" +
      "\\.orderByDesc\\(" + entity + "::getId\\)"
    );
  }

  @Test
  void everyAdminListUsesAUniqueTieBreakerForStablePagination() throws Exception {
    assertCreatedAtThenId(source("service/MemberService.java"), "MemberStoreBindingEntity");
    assertCreatedAtThenId(source("service/OrderQueryService.java"), "OrderEntity");
    assertCreatedAtThenId(source("service/UserPackageQueryService.java"), "UserPackageEntity");
    assertCreatedAtThenId(source("service/DishService.java"), "DishEntity");
    assertCreatedAtThenId(source("service/TaskQueryService.java"), "TaskEntity");
    assertCreatedAtThenId(source("service/PackageTemplateQueryService.java"), "PackageTemplateEntity");
    assertCreatedAtThenId(source("service/Kuaidi100PrinterService.java"), "Kuaidi100PrinterEntity");
    assertCreatedAtThenId(source("service/StoreManagementService.java"), "StoreEntity");
    assertCreatedAtThenId(source("service/StoreManagementService.java"), "FranchiseeEntity");
    assertCreatedAtThenId(source("service/SystemManagementService.java"), "AdminRoleEntity");
    assertCreatedAtThenId(source("service/OperationLogQueryService.java"), "AdminOperationLogEntity");
    assertThat(source("mapper/AdminUserMapper.java"))
      .contains("ORDER BY u.\"createdAt\" DESC, u.\"id\" DESC");
  }
}
