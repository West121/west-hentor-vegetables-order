package cn.hentor.vegetables.service;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class ListSummaryScopeSourceTest {
  private static String source(String relativePath) throws Exception {
    return Files.readString(Path.of(relativePath));
  }

  @Test
  void adminUserSummaryIgnoresKeywordAndStatusFilters() throws Exception {
    String source = source("src/main/java/cn/hentor/vegetables/service/SystemManagementService.java");

    assertTrue(
      source.contains("adminUserMapper.countAdminUsersByStatus(null, null, storeIds)"),
      "后台用户统计只能按数据范围统计，不能带关键字或状态筛选"
    );
  }

  @Test
  void genericPageResultsCanCarryIndependentSummary() throws Exception {
    String pageResult = source("src/main/java/cn/hentor/vegetables/common/PageResult.java");

    assertTrue(pageResult.contains("Object summary"));
    assertTrue(pageResult.contains("this(items, page, pageSize, total, totalPages, null)"));
  }

  @Test
  void businessListsReturnStoreScopedSummary() throws Exception {
    String memberService = source("src/main/java/cn/hentor/vegetables/service/MemberService.java");
    String orderService = source("src/main/java/cn/hentor/vegetables/service/OrderQueryService.java");
    String packageService = source("src/main/java/cn/hentor/vegetables/service/UserPackageQueryService.java");
    String templateService = source("src/main/java/cn/hentor/vegetables/service/PackageTemplateQueryService.java");

    assertTrue(memberService.contains("memberSummary(storeId)"));
    assertTrue(memberService.contains("LIST_BINDING_STATUSES"));
    assertTrue(memberService.contains("DELETED_STATUS"));
    assertTrue(memberService.contains("\"total\", active + disabled + deleted"));
    assertTrue(orderService.contains("orderSummary(storeId)"));
    assertTrue(packageService.contains("userPackageSummary(storeId)"));
    assertTrue(templateService.contains("templateSummary(storeId)"));
  }
}
