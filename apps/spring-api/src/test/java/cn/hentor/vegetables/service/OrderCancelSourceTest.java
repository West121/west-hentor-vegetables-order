package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OrderCancelSourceTest {
  private static String read(String path) throws Exception {
    return Files.readString(Path.of(path));
  }

  @Test
  void adminOrdersExposeSoftCancelEndpoint() throws Exception {
    String controller = read("src/main/java/cn/hentor/vegetables/controller/OrderController.java");
    String service = read("src/main/java/cn/hentor/vegetables/service/OrderQueryService.java");

    assertThat(controller).contains("@PostMapping(\"/{orderId}/cancel\")");
    assertThat(controller).contains("orderQueryService.cancelOrder(orderId, request, session)");
    assertThat(service).contains("public AdminOrderStatusResponse cancelOrder(");
    assertThat(service).contains("orderMapper.markCanceled(update)");
    assertThat(service).contains("\"ORDER_CANCELED\"");
    assertThat(service).contains("new AdminOrderStatusResultDto(now, reason, order.order().getId(), null, \"CANCELED\")");
  }
}
