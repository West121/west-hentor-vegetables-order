package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.SystemDictionaryItemDto;
import cn.hentor.vegetables.dto.SystemDictionaryListResponse;
import cn.hentor.vegetables.dto.SystemDictionaryMetaDto;
import cn.hentor.vegetables.dto.SystemDictionaryRequest;
import cn.hentor.vegetables.dto.SystemDictionaryResponse;
import cn.hentor.vegetables.dto.SystemDictionaryUpsertRequest;
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
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class SystemDictionaryService {
  public static final String DISH_CATEGORY_TYPE = "DISH_CATEGORY";

  private static final String DICTIONARY_INDEX_KEY = "dict.index";
  private static final List<SystemDictionaryMetaDto> DEFAULT_DICTIONARIES = List.of(
    new SystemDictionaryMetaDto(
      DISH_CATEGORY_TYPE,
      true,
      "菜品管理、任务选菜使用的菜品分类。",
      true,
      "菜品类型",
      1
    )
  );
  private static final Map<String, List<SystemDictionaryItemDto>> DEFAULT_ITEMS = Map.of(
    DISH_CATEGORY_TYPE,
    List.of(
      new SystemDictionaryItemDto("LEAFY", true, "叶菜", 1),
      new SystemDictionaryItemDto("FRUIT", true, "茄果", 2),
      new SystemDictionaryItemDto("ROOT", true, "根茎", 3),
      new SystemDictionaryItemDto("MUSHROOM", true, "菌菇", 4),
      new SystemDictionaryItemDto("ACTIVITY", true, "活动", 5)
    )
  );

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final ObjectMapper objectMapper;
  private final StoreMapper storeMapper;
  private final SystemConfigMapper systemConfigMapper;

  public SystemDictionaryService(
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

  public SystemDictionaryListResponse listDictionaries(String storeId) {
    requireStore(storeId);
    return new SystemDictionaryListResponse(readDictionaries(storeId));
  }

  public SystemDictionaryResponse getDictionary(String storeId, String type) {
    requireStore(storeId);
    String normalizedType = normalizeType(type);
    SystemDictionaryMetaDto dictionary = findDictionary(storeId, normalizedType)
      .orElseThrow(() ->
        new ApiException("DICTIONARY_NOT_FOUND", "字典不存在", HttpStatus.NOT_FOUND)
      );
    return new SystemDictionaryResponse(
      dictionary,
      readItems(storeId, normalizedType),
      normalizedType
    );
  }

  public Set<String> enabledCodes(String storeId, String type) {
    String normalizedType = normalizeType(type);
    Optional<SystemDictionaryMetaDto> dictionary = findDictionary(storeId, normalizedType);
    if (dictionary.isPresent() && Boolean.FALSE.equals(dictionary.get().enabled())) {
      return Set.of();
    }

    Set<String> codes = new LinkedHashSet<>();
    for (SystemDictionaryItemDto item : readItems(storeId, normalizedType)) {
      if (!Boolean.FALSE.equals(item.enabled()) && StringUtils.hasText(item.code())) {
        codes.add(item.code());
      }
    }
    return codes;
  }

  @Transactional
  public SystemDictionaryResponse updateDictionary(
    String type,
    SystemDictionaryRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    requireStore(request.storeId());
    String normalizedType = normalizeType(type);
    List<SystemDictionaryMetaDto> beforeDictionaries = readDictionaries(request.storeId());
    List<SystemDictionaryItemDto> beforeItems = readItems(request.storeId(), normalizedType);
    SystemDictionaryMetaDto existing = findInDictionaries(beforeDictionaries, normalizedType)
      .orElse(null);
    SystemDictionaryMetaDto afterDictionary = normalizeDictionary(
      normalizedType,
      request.name(),
      request.description(),
      request.enabled(),
      request.sortOrder(),
      existing
    );
    List<SystemDictionaryItemDto> afterItems = normalizeItems(request.items());
    List<SystemDictionaryMetaDto> afterDictionaries = upsertDictionaryMeta(
      beforeDictionaries,
      afterDictionary
    );

    saveDictionaries(request.storeId(), afterDictionaries);
    saveItems(request.storeId(), normalizedType, afterItems);

    Map<String, Object> beforeValue = new LinkedHashMap<>();
    beforeValue.put("dictionary", existing);
    beforeValue.put("items", beforeItems);
    Map<String, Object> afterValue = new LinkedHashMap<>();
    afterValue.put("dictionary", afterDictionary);
    afterValue.put("items", afterItems);

    writeOperationLog(
      operator.getId(),
      request.storeId(),
      normalizedType,
      beforeValue,
      afterValue,
      "SYSTEM_DICTIONARY_UPDATED"
    );

    return new SystemDictionaryResponse(afterDictionary, afterItems, normalizedType);
  }

  @Transactional
  public SystemDictionaryListResponse upsertDictionary(
    SystemDictionaryUpsertRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    requireStore(request.storeId());
    String normalizedType = normalizeType(request.code());
    List<SystemDictionaryMetaDto> before = readDictionaries(request.storeId());
    SystemDictionaryMetaDto existing = findInDictionaries(before, normalizedType)
      .orElse(null);
    SystemDictionaryMetaDto dictionary = normalizeDictionary(
      normalizedType,
      request.name(),
      request.description(),
      request.enabled(),
      request.sortOrder(),
      existing
    );
    List<SystemDictionaryMetaDto> after = upsertDictionaryMeta(before, dictionary);
    saveDictionaries(request.storeId(), after);
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      normalizedType,
      existing,
      dictionary,
      existing == null ? "SYSTEM_DICTIONARY_CREATED" : "SYSTEM_DICTIONARY_META_UPDATED"
    );
    return new SystemDictionaryListResponse(after);
  }

  @Transactional
  public SystemDictionaryListResponse deleteDictionary(
    String storeId,
    String type,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    requireStore(storeId);
    String normalizedType = normalizeType(type);
    List<SystemDictionaryMetaDto> before = readDictionaries(storeId);
    SystemDictionaryMetaDto dictionary = findInDictionaries(before, normalizedType)
      .orElseThrow(() ->
        new ApiException("DICTIONARY_NOT_FOUND", "字典不存在", HttpStatus.NOT_FOUND)
      );
    if (Boolean.TRUE.equals(dictionary.builtIn())) {
      throw new ApiException("DICTIONARY_BUILT_IN", "内置字典不能删除", HttpStatus.BAD_REQUEST);
    }

    List<SystemDictionaryMetaDto> after = before
      .stream()
      .filter(item -> !normalizedType.equals(item.code()))
      .toList();
    saveDictionaries(storeId, after);
    systemConfigMapper.delete(
      new LambdaQueryWrapper<SystemConfigEntity>()
        .eq(SystemConfigEntity::getStoreId, storeId)
        .eq(SystemConfigEntity::getKey, configKey(normalizedType))
    );
    writeOperationLog(
      operator.getId(),
      storeId,
      normalizedType,
      dictionary,
      null,
      "SYSTEM_DICTIONARY_DELETED"
    );
    return new SystemDictionaryListResponse(after);
  }

  private Optional<SystemDictionaryMetaDto> findDictionary(String storeId, String type) {
    return findInDictionaries(readDictionaries(storeId), type);
  }

  private Optional<SystemDictionaryMetaDto> findInDictionaries(
    List<SystemDictionaryMetaDto> dictionaries,
    String type
  ) {
    return dictionaries.stream().filter(item -> type.equals(item.code())).findFirst();
  }

  private List<SystemDictionaryMetaDto> readDictionaries(String storeId) {
    SystemConfigEntity config = systemConfigMapper.selectOne(
      new LambdaQueryWrapper<SystemConfigEntity>()
        .eq(SystemConfigEntity::getStoreId, storeId)
        .eq(SystemConfigEntity::getKey, DICTIONARY_INDEX_KEY)
        .last("LIMIT 1")
    );
    return normalizeDictionaries(parseDictionaries(config == null ? null : config.getValue()));
  }

  private List<SystemDictionaryMetaDto> parseDictionaries(String value) {
    if (!StringUtils.hasText(value)) {
      return List.of();
    }
    try {
      return objectMapper.readValue(
        value,
        new TypeReference<List<SystemDictionaryMetaDto>>() {}
      );
    } catch (JsonProcessingException exception) {
      return List.of();
    }
  }

  private List<SystemDictionaryMetaDto> normalizeDictionaries(
    List<SystemDictionaryMetaDto> dictionaries
  ) {
    Map<String, SystemDictionaryMetaDto> byCode = new LinkedHashMap<>();
    for (SystemDictionaryMetaDto dictionary : DEFAULT_DICTIONARIES) {
      byCode.put(dictionary.code(), dictionary);
    }

    int index = DEFAULT_DICTIONARIES.size() + 1;
    for (
      SystemDictionaryMetaDto dictionary :
      dictionaries == null ? List.<SystemDictionaryMetaDto>of() : dictionaries
    ) {
      String code = normalizeCode(dictionary.code());
      if (!StringUtils.hasText(code)) {
        continue;
      }
      SystemDictionaryMetaDto existing = byCode.get(code);
      byCode.put(
        code,
        normalizeDictionary(
          code,
          dictionary.name(),
          dictionary.description(),
          dictionary.enabled(),
          dictionary.sortOrder() == null ? index : dictionary.sortOrder(),
          existing
        )
      );
      index += 1;
    }

    return byCode
      .values()
      .stream()
      .sorted(Comparator.comparing(SystemDictionaryMetaDto::sortOrder))
      .toList();
  }

  private List<SystemDictionaryMetaDto> upsertDictionaryMeta(
    List<SystemDictionaryMetaDto> dictionaries,
    SystemDictionaryMetaDto dictionary
  ) {
    Map<String, SystemDictionaryMetaDto> byCode = new LinkedHashMap<>();
    for (SystemDictionaryMetaDto item : dictionaries) {
      byCode.put(item.code(), item);
    }
    byCode.put(dictionary.code(), dictionary);
    return normalizeDictionaries(new ArrayList<>(byCode.values()));
  }

  private SystemDictionaryMetaDto normalizeDictionary(
    String code,
    String name,
    String description,
    Boolean enabled,
    Integer sortOrder,
    SystemDictionaryMetaDto existing
  ) {
    boolean builtIn = existing != null && Boolean.TRUE.equals(existing.builtIn());
    String fallbackName = existing == null ? code : existing.name();
    String normalizedName = StringUtils.hasText(name) ? name.trim() : fallbackName;
    if (!StringUtils.hasText(normalizedName)) {
      throw new ApiException("DICTIONARY_NAME_REQUIRED", "字典名称不能为空", HttpStatus.BAD_REQUEST);
    }
    return new SystemDictionaryMetaDto(
      normalizeType(code),
      builtIn,
      description == null
        ? existing == null ? "" : existing.description()
        : description.trim(),
      builtIn ? true : !Boolean.FALSE.equals(enabled),
      normalizedName,
      sortOrder == null ? existing == null ? 1 : existing.sortOrder() : sortOrder
    );
  }

  private void saveDictionaries(String storeId, List<SystemDictionaryMetaDto> dictionaries) {
    SystemConfigEntity config = new SystemConfigEntity();
    config.setId(id());
    config.setStoreId(storeId);
    config.setKey(DICTIONARY_INDEX_KEY);
    config.setValue(toJson(normalizeDictionaries(dictionaries)));
    config.setCreatedAt(LocalDateTime.now());
    config.setUpdatedAt(LocalDateTime.now());
    systemConfigMapper.upsertStoreConfig(config);
  }

  private List<SystemDictionaryItemDto> readItems(String storeId, String type) {
    SystemConfigEntity config = systemConfigMapper.selectOne(
      new LambdaQueryWrapper<SystemConfigEntity>()
        .eq(SystemConfigEntity::getStoreId, storeId)
        .eq(SystemConfigEntity::getKey, configKey(type))
        .last("LIMIT 1")
    );
    List<SystemDictionaryItemDto> parsed = parseItems(config == null ? null : config.getValue());
    return parsed.isEmpty() ? defaults(type) : parsed;
  }

  private List<SystemDictionaryItemDto> parseItems(String value) {
    if (!StringUtils.hasText(value)) {
      return List.of();
    }
    try {
      return normalizeItems(
        objectMapper.readValue(
          value,
          new TypeReference<List<SystemDictionaryItemDto>>() {}
        )
      );
    } catch (JsonProcessingException | ApiException exception) {
      return List.of();
    }
  }

  private List<SystemDictionaryItemDto> normalizeItems(List<SystemDictionaryItemDto> items) {
    Map<String, SystemDictionaryItemDto> byCode = new LinkedHashMap<>();
    int index = 1;
    for (SystemDictionaryItemDto item : items == null ? List.<SystemDictionaryItemDto>of() : items) {
      String code = normalizeCode(item.code());
      String name = item.name() == null ? "" : item.name().trim();
      if (!StringUtils.hasText(code) || !StringUtils.hasText(name)) {
        continue;
      }
      byCode.put(
        code,
        new SystemDictionaryItemDto(
          code,
          !Boolean.FALSE.equals(item.enabled()),
          name,
          item.sortOrder() == null ? index : item.sortOrder()
        )
      );
      index += 1;
    }
    if (byCode.isEmpty()) {
      throw new ApiException("DICTIONARY_EMPTY", "字典至少保留一条有效配置", HttpStatus.BAD_REQUEST);
    }
    return new ArrayList<>(byCode.values())
      .stream()
      .sorted(Comparator.comparing(SystemDictionaryItemDto::sortOrder))
      .toList();
  }

  private void saveItems(String storeId, String type, List<SystemDictionaryItemDto> items) {
    SystemConfigEntity config = new SystemConfigEntity();
    config.setId(id());
    config.setStoreId(storeId);
    config.setKey(configKey(type));
    config.setValue(toJson(items));
    config.setCreatedAt(LocalDateTime.now());
    config.setUpdatedAt(LocalDateTime.now());
    systemConfigMapper.upsertStoreConfig(config);
  }

  private List<SystemDictionaryItemDto> defaults(String type) {
    return DEFAULT_ITEMS.getOrDefault(type, List.of());
  }

  private String configKey(String type) {
    return "dict." + type;
  }

  private String normalizeType(String type) {
    String normalized = normalizeCode(type);
    if (!StringUtils.hasText(normalized)) {
      throw new ApiException("DICTIONARY_TYPE_INVALID", "字典编码不能为空", HttpStatus.BAD_REQUEST);
    }
    if (normalized.length() > 64) {
      throw new ApiException("DICTIONARY_TYPE_INVALID", "字典编码最多 64 个字符", HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private String normalizeCode(String value) {
    return value == null ? "" : value.trim().toUpperCase().replaceAll("[^A-Z0-9_]", "_");
  }

  private StoreEntity requireStore(String storeId) {
    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }
    return store;
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String type,
    Object beforeValue,
    Object afterValue,
    String action
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource("system_dictionary");
    log.setResourceId(type);
    log.setAction(action);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams("{}");
    log.setResponseData("{}");
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private String toJson(Object value) {
    try {
      return value == null ? "null" : objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      return "[]";
    }
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }
}
