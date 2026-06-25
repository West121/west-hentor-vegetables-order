package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class DeliveryRangeSupportTest {
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void allowsWholeProvinceWhenProvinceIsSelected() throws Exception {
    List<String> provinces = DeliveryRangeSupport.readJsonStringArray(objectMapper, "[\"江苏省\"]");
    List<String> cities = DeliveryRangeSupport.readJsonStringArray(objectMapper, "[]");

    assertThat(DeliveryRangeSupport.allows("江苏省", "南京市", provinces, cities)).isTrue();
    assertThat(DeliveryRangeSupport.allows("江苏省", "苏州市", provinces, cities)).isTrue();
    assertThat(DeliveryRangeSupport.allows("安徽省", "合肥市", provinces, cities)).isFalse();
  }

  @Test
  void allowsExplicitCitiesAcrossProvinces() throws Exception {
    List<String> provinces = DeliveryRangeSupport.readJsonStringArray(objectMapper, "[\"江苏省\"]");
    List<String> cities = DeliveryRangeSupport.readJsonStringArray(objectMapper, "[\"合肥市\"]");

    assertThat(DeliveryRangeSupport.allows("江苏省", "苏州市", provinces, cities)).isTrue();
    assertThat(DeliveryRangeSupport.allows("安徽省", "合肥市", provinces, cities)).isTrue();
    assertThat(DeliveryRangeSupport.allows("安徽省", "芜湖市", provinces, cities)).isFalse();
  }

  @Test
  void allowsOnlySelectedCityWhenNoProvinceIsSelected() throws Exception {
    List<String> cities = DeliveryRangeSupport.readJsonStringArray(objectMapper, "[\"南京市\"]");

    assertThat(DeliveryRangeSupport.allows("江苏省", "南京市", List.of(), cities)).isTrue();
    assertThat(DeliveryRangeSupport.allows("江苏省", "苏州市", List.of(), cities)).isFalse();
  }
}
