package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class ChinaRegionServiceTest {
  private final ChinaRegionService service = new ChinaRegionService(new ObjectMapper());

  @Test
  void validatesProvinceCityDistrictCombinations() {
    assertThat(service.isValidProvince("江苏省")).isTrue();
    assertThat(service.isValidCity("江苏省", "南京市")).isTrue();
    assertThat(service.isValidDistrict("江苏省", "南京市", "六合区")).isTrue();

    assertThat(service.isValidCity("福建省", "南京市")).isFalse();
    assertThat(service.isValidDistrict("江苏省", "南京市", "思明区")).isFalse();
  }

  @Test
  void supportsDirectCityProvince() {
    assertThat(service.isDirectCityProvince("上海市")).isTrue();
    assertThat(service.isValidCity("上海市", "上海市")).isTrue();
    assertThat(service.isValidDistrict("上海市", "上海市", "浦东新区")).isTrue();
  }
}
