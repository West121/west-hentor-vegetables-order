package cn.hentor.vegetables.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ChinaRegionService {
  private static final Set<String> DIRECT_CITY_PROVINCES = Set.of("北京市", "天津市", "上海市", "重庆市");

  private final Map<String, ProvinceRegion> provinceMap;

  public ChinaRegionService(ObjectMapper objectMapper) {
    this.provinceMap = loadRegions(objectMapper);
  }

  public Set<String> provinceNames() {
    return provinceMap.keySet();
  }

  public boolean isDirectCityProvince(String province) {
    return DIRECT_CITY_PROVINCES.contains(province);
  }

  public boolean isValidProvince(String province) {
    return StringUtils.hasText(province) && provinceMap.containsKey(province);
  }

  public boolean isValidCity(String province, String city) {
    ProvinceRegion provinceRegion = provinceMap.get(province);
    return provinceRegion != null && provinceRegion.cityMap().containsKey(city);
  }

  public boolean isValidDistrict(String province, String city, String district) {
    ProvinceRegion provinceRegion = provinceMap.get(province);
    if (provinceRegion == null) {
      return false;
    }
    CityRegion cityRegion = provinceRegion.cityMap().get(city);
    return cityRegion != null && cityRegion.districtSet().contains(district);
  }

  private Map<String, ProvinceRegion> loadRegions(ObjectMapper objectMapper) {
    try (InputStream inputStream = new ClassPathResource("china-regions.json").getInputStream()) {
      List<RawProvinceRegion> rawRegions = objectMapper.readValue(
        inputStream,
        new TypeReference<List<RawProvinceRegion>>() {}
      );
      Map<String, ProvinceRegion> regions = new LinkedHashMap<>();
      for (RawProvinceRegion rawProvince : rawRegions) {
        Map<String, CityRegion> cityMap = new LinkedHashMap<>();
        for (RawCityRegion rawCity : rawProvince.cities()) {
          cityMap.put(
            rawCity.city(),
            new CityRegion(rawCity.city(), rawCity.districts().stream().collect(Collectors.toSet()))
          );
        }
        regions.put(rawProvince.province(), new ProvinceRegion(rawProvince.province(), cityMap));
      }
      return regions;
    } catch (IOException error) {
      throw new IllegalStateException("中国省市区数据加载失败", error);
    }
  }

  private record RawProvinceRegion(String province, List<RawCityRegion> cities) {}

  private record RawCityRegion(String city, List<String> districts) {}

  private record ProvinceRegion(String province, Map<String, CityRegion> cityMap) {}

  private record CityRegion(String city, Set<String> districtSet) {}
}
