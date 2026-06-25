package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import cn.hentor.vegetables.dto.DishImportRow;
import cn.hentor.vegetables.dto.PackageTemplateImportRow;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class SpreadsheetImportServiceTest {
  private final SpreadsheetImportService service = new SpreadsheetImportService();

  @Test
  void parsesDishImportRowsFromCsvHeaders() {
    MockMultipartFile file = new MockMultipartFile(
      "file",
      "dishes.csv",
      "text/csv",
      """
      菜品名称,分类,库存斤数,起订步进,状态,排序,描述
      番茄,茄果,37斤,1斤,上架,2,本周新鲜到店
      """.getBytes(StandardCharsets.UTF_8)
    );

    List<DishImportRow> rows = service.parseDishRows(file);

    assertThat(rows).hasSize(1);
    assertThat(rows.getFirst().name()).isEqualTo("番茄");
    assertThat(rows.getFirst().category()).isEqualTo("茄果");
    assertThat(rows.getFirst().stockJin()).isEqualByComparingTo(new BigDecimal("37"));
    assertThat(rows.getFirst().stepJin()).isEqualByComparingTo(new BigDecimal("1"));
    assertThat(rows.getFirst().status()).isEqualTo("ON_SALE");
    assertThat(rows.getFirst().sortOrder()).isEqualTo(2);
  }

  @Test
  void parsesPackageTemplateImportRowsWithBenefitsFromCsvHeaders() {
    MockMultipartFile file = new MockMultipartFile(
      "file",
      "templates.csv",
      "text/csv",
      """
      套餐名称,总次数,单次斤数,状态,排序,附加权益名称,附加权益总量,附加权益单位,附加权益排序
      8斤周套餐,8次,8斤,启用,1,鸡蛋,1箱,箱,1
      8斤周套餐,8次,8斤,启用,1,老母鸡,1只,只,2
      """.getBytes(StandardCharsets.UTF_8)
    );

    List<PackageTemplateImportRow> rows = service.parsePackageTemplateRows(file);

    assertThat(rows).hasSize(2);
    assertThat(rows.getFirst().templateName()).isEqualTo("8斤周套餐");
    assertThat(rows.getFirst().totalTimes()).isEqualTo(8);
    assertThat(rows.getFirst().weightLimitJin()).isEqualByComparingTo(new BigDecimal("8"));
    assertThat(rows.getFirst().status()).isEqualTo("ACTIVE");
    assertThat(rows.get(1).benefitName()).isEqualTo("老母鸡");
    assertThat(rows.get(1).benefitTotalQuantity()).isEqualByComparingTo(new BigDecimal("1"));
    assertThat(rows.get(1).benefitUnit()).isEqualTo("只");
    assertThat(rows.get(1).benefitSortOrder()).isEqualTo(2);
  }
}
