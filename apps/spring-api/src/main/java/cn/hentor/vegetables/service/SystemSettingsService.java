package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.SystemSettingsDto;
import cn.hentor.vegetables.dto.SystemSettingsRequest;
import cn.hentor.vegetables.dto.SystemSettingsResponse;
import cn.hentor.vegetables.dto.SystemSettingsStoreDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.SystemConfigEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.mapper.SystemConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class SystemSettingsService {
  private static final int DEFAULT_HOME_DISH_COLUMNS = 3;
  private static final List<String> CONFIG_KEYS = List.of(
    "about_text",
    "customer_service_tel",
    "home_dish_columns",
    "login_image_url",
    "login_subtitle",
    "login_title",
    "login_welcome",
    "privacy_policy_url",
    "user_agreement_url"
  );

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final ObjectMapper objectMapper;
  private final StoreMapper storeMapper;
  private final SystemConfigMapper systemConfigMapper;

  public SystemSettingsService(
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    ObjectMapper objectMapper,
    StoreMapper storeMapper,
    SystemConfigMapper systemConfigMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.objectMapper = objectMapper;
    this.storeMapper = storeMapper;
    this.systemConfigMapper = systemConfigMapper;
  }

  public SystemSettingsResponse getSystemSettings(String storeId) {
    return new SystemSettingsResponse(readSystemSettings(storeId));
  }

  @Transactional
  public SystemSettingsResponse updateSystemSettings(
    SystemSettingsRequest request,
    String operatorId
  ) {
    AdminUserEntity operator = requireActiveOperator(operatorId);
    String customerServiceTel = normalizeText(request.customerServiceTel());
    List<String> deliveryCities = normalizeDeliveryRangeValues(request.deliveryCities());
    List<String> deliveryProvinces = normalizeDeliveryRangeValues(request.deliveryProvinces());
    int homeDishColumns = normalizeHomeDishColumns(request.homeDishColumns());
    SystemSettingsDto before = readSystemSettings(request.storeId());

    StoreEntity storeUpdate = new StoreEntity();
    storeUpdate.setId(request.storeId());
    storeUpdate.setCustomerServiceTel(StringUtils.hasText(customerServiceTel) ? customerServiceTel : null);
    storeUpdate.setDeliveryCities(toJson(deliveryCities));
    storeUpdate.setDeliveryProvinces(toJson(deliveryProvinces));
    storeUpdate.setUpdatedAt(LocalDateTime.now());
    storeMapper.updateSystemSettings(storeUpdate);

    Map<String, String> configValues = Map.of(
      "about_text", normalizeText(request.aboutText()),
      "customer_service_tel", customerServiceTel,
      "home_dish_columns", String.valueOf(homeDishColumns),
      "login_image_url", normalizeText(request.loginImageUrl()),
      "login_subtitle", normalizeText(request.loginSubtitle()),
      "login_title", normalizeText(request.loginTitle()),
      "login_welcome", normalizeText(request.loginWelcome()),
      "privacy_policy_url", normalizeText(request.privacyPolicyUrl()),
      "user_agreement_url", normalizeText(request.userAgreementUrl())
    );
    LocalDateTime now = LocalDateTime.now();
    for (Map.Entry<String, String> entry : configValues.entrySet()) {
      SystemConfigEntity config = new SystemConfigEntity();
      config.setId(id());
      config.setStoreId(request.storeId());
      config.setKey(entry.getKey());
      config.setValue(toJson(entry.getValue()));
      config.setCreatedAt(now);
      config.setUpdatedAt(now);
      systemConfigMapper.upsertStoreConfig(config);
    }

    SystemSettingsDto after = readSystemSettings(request.storeId());
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      "SYSTEM_SETTINGS_UPDATED",
      settingsLogValue(before),
      settingsLogValue(after)
    );
    return new SystemSettingsResponse(after);
  }

  private SystemSettingsDto readSystemSettings(String storeId) {
    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }
    Map<String, String> configByKey = systemConfigMapper.selectList(
        new LambdaQueryWrapper<SystemConfigEntity>()
          .eq(SystemConfigEntity::getStoreId, storeId)
          .in(SystemConfigEntity::getKey, CONFIG_KEYS)
      )
      .stream()
      .collect(Collectors.toMap(SystemConfigEntity::getKey, SystemConfigEntity::getValue, (left, right) -> right));

    return new SystemSettingsDto(
      readJsonText(configByKey.get("about_text")),
      store.getCustomerServiceTel() == null ? "" : store.getCustomerServiceTel(),
      readJsonStringArray(store.getDeliveryCities()),
      readJsonStringArray(store.getDeliveryProvinces()),
      readHomeDishColumns(configByKey.get("home_dish_columns")),
      readJsonText(configByKey.get("login_image_url")),
      readJsonText(configByKey.get("login_subtitle")),
      readJsonText(configByKey.get("login_title")),
      readJsonText(configByKey.get("login_welcome")),
      readJsonText(configByKey.get("privacy_policy_url")),
      new SystemSettingsStoreDto(store.getId(), store.getName()),
      readJsonText(configByKey.get("user_agreement_url"))
    );
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private String normalizeText(String value) {
    return value == null ? "" : value.trim();
  }

  private int normalizeHomeDishColumns(Integer value) {
    int columns = value == null ? DEFAULT_HOME_DISH_COLUMNS : value;
    if (columns != 2 && columns != 3 && columns != 4) {
      throw new ApiException("INVALID_HOME_DISH_COLUMNS", "首页菜品每行数量只能是 2、3、4", HttpStatus.BAD_REQUEST);
    }
    return columns;
  }

  private List<String> normalizeDeliveryRangeValues(List<String> values) {
    Set<String> seen = new LinkedHashSet<>();
    for (String value : values == null ? List.<String>of() : values) {
      String trimmed = normalizeText(value);
      if (StringUtils.hasText(trimmed)) {
        seen.add(trimmed);
      }
    }
    return List.copyOf(seen);
  }

  private List<String> readJsonStringArray(String value) {
    if (!StringUtils.hasText(value)) {
      return List.of();
    }
    try {
      JsonNode node = objectMapper.readTree(value);
      if (!node.isArray()) {
        return List.of();
      }
      Set<String> values = new LinkedHashSet<>();
      node.forEach(item -> {
        if (item.isTextual() && StringUtils.hasText(item.asText())) {
          values.add(item.asText().trim());
        }
      });
      return List.copyOf(values);
    } catch (JsonProcessingException exception) {
      return List.of();
    }
  }

  private String readJsonText(String value) {
    if (!StringUtils.hasText(value)) {
      return "";
    }
    try {
      JsonNode node = objectMapper.readTree(value);
      return node.isTextual() ? node.asText() : "";
    } catch (JsonProcessingException exception) {
      return value;
    }
  }

  private int readHomeDishColumns(String value) {
    String text = readJsonText(value);
    if (!StringUtils.hasText(text)) {
      text = normalizeText(value);
    }
    if (!StringUtils.hasText(text)) {
      return DEFAULT_HOME_DISH_COLUMNS;
    }
    try {
      return normalizeHomeDishColumns(Integer.valueOf(text.trim()));
    } catch (NumberFormatException exception) {
      return DEFAULT_HOME_DISH_COLUMNS;
    }
  }

  private Map<String, Object> settingsLogValue(SystemSettingsDto settings) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("aboutText", settings.aboutText());
    value.put("customerServiceTel", settings.customerServiceTel());
    value.put("deliveryCities", settings.deliveryCities());
    value.put("deliveryProvinces", settings.deliveryProvinces());
    value.put("homeDishColumns", settings.homeDishColumns());
    value.put("loginImageUrl", settings.loginImageUrl());
    value.put("loginSubtitle", settings.loginSubtitle());
    value.put("loginTitle", settings.loginTitle());
    value.put("loginWelcome", settings.loginWelcome());
    value.put("privacyPolicyUrl", settings.privacyPolicyUrl());
    value.put("userAgreementUrl", settings.userAgreementUrl());
    return value;
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String action,
    Object beforeValue,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource("system_config");
    log.setResourceId(storeId);
    log.setAction(action);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams("{}");
    log.setResponseData("{}");
    log.setStatusCode(200);
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private String toJson(Object value) {
    try {
      return value == null ? "null" : objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      return "{}";
    }
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }
}
