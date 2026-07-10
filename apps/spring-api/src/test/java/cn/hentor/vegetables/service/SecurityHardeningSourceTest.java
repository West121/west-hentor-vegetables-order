package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class SecurityHardeningSourceTest {
  private static String read(String path) throws Exception {
    return Files.readString(Path.of(path));
  }

  @Test
  void miniappDevLoginRequiresExplicitSwitchAndSecret() throws Exception {
    String controller = read("src/main/java/cn/hentor/vegetables/controller/MiniappAuthController.java");
    String application = read("src/main/resources/application.yml");

    assertThat(application).contains("HENTOR_MINIAPP_DEV_LOGIN_ENABLED:false");
    assertThat(application).contains("HENTOR_MINIAPP_DEV_LOGIN_SECRET:");
    assertThat(controller).contains("DEV_LOGIN_DISABLED");
    assertThat(controller).contains("X-Dev-Login-Secret");
    assertThat(controller).contains("DEV_LOGIN_FORBIDDEN");
  }

  @Test
  void shipmentCsvNeutralizesSpreadsheetFormulas() throws Exception {
    String service = read("src/main/java/cn/hentor/vegetables/service/ShipmentStatsService.java");

    assertThat(service).contains("\"=+-@\".indexOf(trimmed.charAt(0))");
    assertThat(service).contains("? \"'\" + rawText");
  }

  @Test
  void miniappReservationQuotaUsesTaskWeightAndOccupiedOrders() throws Exception {
    String service = read("src/main/java/cn/hentor/vegetables/service/MiniReservationService.java");

    assertThat(service).contains("ensureTaskQuota(activeTask, store.getId(), newWeightsByDishId");
    assertThat(service).contains("taskDish.getTotalWeightJin()");
    assertThat(service).contains("loadTaskUsedWeights(storeId, activeTask, dishIds, excludeOrderId)");
    assertThat(service).contains(".notIn(OrderEntity::getStatus, List.of(\"CANCELED\", \"VOIDED\"))");
    assertThat(service).contains("DISH_SOLD_OUT");
  }

  @Test
  void miniappHomeAllowsAnonymousBrowsingBeforePhoneAuthorization() throws Exception {
    String controller = read("src/main/java/cn/hentor/vegetables/controller/MiniappHomeController.java");
    String service = read("src/main/java/cn/hentor/vegetables/service/MiniHomeService.java");

    assertThat(controller).contains("resolveSessionOrNull(authorization)");
    assertThat(controller).doesNotContain("requireSession(authorization)");
    assertThat(service).contains("if (session == null)");
    assertThat(service).contains("dishes");
    assertThat(service).contains("null,\n        null,\n        null,\n        dishes,\n        null");
  }
}
