package cn.hentor.vegetables.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.util.StringUtils;

final class DeliveryRangeSupport {
  private DeliveryRangeSupport() {}

  static boolean allows(
    String province,
    String city,
    List<String> deliveryProvinces,
    List<String> deliveryCities
  ) {
    if (deliveryProvinces.isEmpty() && deliveryCities.isEmpty()) {
      return true;
    }

    String normalizedProvince = normalizeNullableText(province);
    String normalizedCity = normalizeNullableText(city);
    return (
      (StringUtils.hasText(normalizedProvince) && deliveryProvinces.contains(normalizedProvince)) ||
      (StringUtils.hasText(normalizedCity) && deliveryCities.contains(normalizedCity))
    );
  }

  static String rangeText(List<String> deliveryProvinces, List<String> deliveryCities) {
    List<String> scopes = new java.util.ArrayList<>();
    scopes.addAll(deliveryProvinces.stream().map(province -> province + "全省").toList());
    scopes.addAll(deliveryCities);
    return scopes.isEmpty() ? "全国不限" : String.join("、", scopes);
  }

  static List<String> readJsonStringArray(ObjectMapper objectMapper, String value) {
    if (!StringUtils.hasText(value)) {
      return List.of();
    }
    try {
      List<String> raw = objectMapper.readValue(value, new TypeReference<>() {});
      Set<String> values = new LinkedHashSet<>();
      for (String item : raw) {
        String normalized = normalizeNullableText(item);
        if (StringUtils.hasText(normalized)) {
          values.add(normalized);
        }
      }
      return List.copyOf(values);
    } catch (JsonProcessingException error) {
      return List.of();
    }
  }

  private static String normalizeNullableText(String value) {
    String normalized = value == null ? "" : value.trim();
    return StringUtils.hasText(normalized) ? normalized : null;
  }
}
