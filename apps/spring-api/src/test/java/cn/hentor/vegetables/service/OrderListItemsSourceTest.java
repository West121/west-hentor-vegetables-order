package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OrderListItemsSourceTest {
  private static String read(String path) throws Exception {
    return Files.readString(Path.of(path));
  }

  @Test
  void adminOrderListHydratesItemsBenefitsAndShipments() throws Exception {
    String dto = read("src/main/java/cn/hentor/vegetables/dto/OrderListItem.java");
    String service = read("src/main/java/cn/hentor/vegetables/service/OrderQueryService.java");

    assertThat(dto).contains("List<AdminOrderItemDto> items");
    assertThat(dto).contains("List<AdminOrderBenefitItemDto> benefitItems");
    assertThat(dto).contains("List<AdminOrderShipmentDto> shipments");
    assertThat(dto).contains("Map<String, String> addressSnapshot");
    assertThat(service).contains("hydrateOrderListItems(result.getRecords())");
    assertThat(service).contains("record.setAddressSnapshot");
    assertThat(service).contains("orderItemMapper");
    assertThat(service).contains("record.setItems");
    assertThat(service).contains("record.setBenefitItems");
    assertThat(service).contains("record.setShipments");
  }
}
