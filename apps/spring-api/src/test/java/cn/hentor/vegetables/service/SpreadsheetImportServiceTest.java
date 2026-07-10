package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import cn.hentor.vegetables.dto.DishImportRow;
import cn.hentor.vegetables.dto.PackageTemplateImportRow;
import cn.hentor.vegetables.dto.UserPackageImportRow;
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
      菜品名称,分类,起订步进,状态,排序,描述
      番茄,茄果,1斤,上架,2,本周新鲜到店
      """.getBytes(StandardCharsets.UTF_8)
    );

    List<DishImportRow> rows = service.parseDishRows(file);

    assertThat(rows).hasSize(1);
    assertThat(rows.getFirst().name()).isEqualTo("番茄");
    assertThat(rows.getFirst().category()).isEqualTo("茄果");
    assertThat(rows.getFirst().stockJin()).isNull();
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

  @Test
  void parsesUserPackageImportRowsWithNicknameAndAddressFromCsvHeaders() {
    MockMultipartFile file = new MockMultipartFile(
      "file",
      "user-packages.csv",
      "text/csv",
      """
      手机号,昵称,省,市,区,详细地址,套餐名称,总次数,已用次数,状态,备注
      15295081992,张三,江苏省,南京市,六合区,龙池街道冠城大通,8斤周套餐,8,1,正常,补录
      """.getBytes(StandardCharsets.UTF_8)
    );

    List<UserPackageImportRow> rows = service.parseUserPackageRows(file);

    assertThat(rows).hasSize(1);
    UserPackageImportRow row = rows.getFirst();
    assertThat(row.phone()).isEqualTo("15295081992");
    assertThat(row.nickname()).isEqualTo("张三");
    assertThat(row.province()).isEqualTo("江苏省");
    assertThat(row.city()).isEqualTo("南京市");
    assertThat(row.district()).isEqualTo("六合区");
    assertThat(row.detail()).isEqualTo("龙池街道冠城大通");
    assertThat(row.templateName()).isEqualTo("8斤周套餐");
    assertThat(row.totalTimes()).isEqualTo(8);
    assertThat(row.usedTimes()).isEqualTo(1);
    assertThat(row.status()).isEqualTo("ACTIVE");
    assertThat(row.remark()).isEqualTo("补录");
  }
}
