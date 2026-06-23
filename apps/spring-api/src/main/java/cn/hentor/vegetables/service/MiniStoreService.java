package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniMemberStoreDto;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.dto.MiniStoreListData;
import cn.hentor.vegetables.dto.MiniStorePublicSettingsDto;
import cn.hentor.vegetables.dto.MiniStorePublicSummaryDto;
import cn.hentor.vegetables.dto.MiniStoreSwitchRequest;
import cn.hentor.vegetables.dto.MiniStoreSwitchResponse;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.SystemConfigEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.mapper.SystemConfigMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MiniStoreService {
  private static final List<String> PUBLIC_CONFIG_KEYS = List.of(
    "about_text",
    "login_image_url",
    "login_subtitle",
    "login_title",
    "login_welcome",
    "privacy_policy_url",
    "user_agreement_url"
  );

  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final MiniAuthService miniAuthService;
  private final ObjectMapper objectMapper;
  private final StoreMapper storeMapper;
  private final SystemConfigMapper systemConfigMapper;
  private final UserMapper userMapper;

  public MiniStoreService(
    MemberStoreBindingMapper memberStoreBindingMapper,
    MiniAuthService miniAuthService,
    ObjectMapper objectMapper,
    StoreMapper storeMapper,
    SystemConfigMapper systemConfigMapper,
    UserMapper userMapper
  ) {
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.miniAuthService = miniAuthService;
    this.objectMapper = objectMapper;
    this.storeMapper = storeMapper;
    this.systemConfigMapper = systemConfigMapper;
    this.userMapper = userMapper;
  }

  public MiniStorePublicSettingsDto getPublicSettings(String storeCode) {
    StoreEntity store = miniAuthService.findAvailableStore(storeCode);
    Map<String, String> configs = systemConfigMapper.selectList(
        new LambdaQueryWrapper<SystemConfigEntity>()
          .eq(SystemConfigEntity::getStoreId, store.getId())
          .in(SystemConfigEntity::getKey, PUBLIC_CONFIG_KEYS)
      )
      .stream()
      .collect(Collectors.toMap(SystemConfigEntity::getKey, SystemConfigEntity::getValue, (left, right) -> right));

    return new MiniStorePublicSettingsDto(
      readJsonText(configs.get("about_text")),
      store.getCustomerServiceTel(),
      readJsonText(configs.get("login_image_url")),
      readJsonText(configs.get("login_subtitle")),
      readJsonText(configs.get("login_title")),
      readJsonText(configs.get("login_welcome")),
      readJsonText(configs.get("privacy_policy_url")),
      new MiniStorePublicSummaryDto(store.getCode(), store.getId(), store.getName()),
      readJsonText(configs.get("user_agreement_url"))
    );
  }

  public MiniStoreListData listMemberStores(MiniSessionContext session) {
    List<MemberStoreBindingEntity> bindings = memberStoreBindingMapper.selectList(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, session.userId())
        .apply("\"status\" = 'ACTIVE'")
        .orderByDesc(MemberStoreBindingEntity::getIsDefault)
        .orderByAsc(MemberStoreBindingEntity::getCreatedAt)
    );
    if (bindings.isEmpty()) {
      return new MiniStoreListData(null, List.of());
    }

    Map<String, MemberStoreBindingEntity> bindingByStoreId = bindings
      .stream()
      .collect(Collectors.toMap(MemberStoreBindingEntity::getStoreId, Function.identity(), (left, right) -> left));

    List<MiniMemberStoreDto> stores = storeMapper.selectList(
        new LambdaQueryWrapper<StoreEntity>()
          .in(StoreEntity::getId, bindingByStoreId.keySet())
          .apply("\"status\" = 'ACTIVE'")
      )
      .stream()
      .map(store -> toMemberStoreDto(store, bindingByStoreId.get(store.getId()), session.storeId()))
      .sorted(
        Comparator
          .comparing(MiniMemberStoreDto::isCurrent).reversed()
          .thenComparing(MiniMemberStoreDto::isDefault, Comparator.reverseOrder())
          .thenComparing(MiniMemberStoreDto::name, Comparator.nullsLast(String::compareTo))
      )
      .toList();

    MiniMemberStoreDto currentStore = stores
      .stream()
      .filter(MiniMemberStoreDto::isCurrent)
      .findFirst()
      .orElse(null);

    return new MiniStoreListData(currentStore, stores);
  }

  @Transactional
  public MiniStoreSwitchResponse switchStore(MiniSessionContext session, MiniStoreSwitchRequest request) {
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, session.userId())
        .eq(MemberStoreBindingEntity::getStoreId, request.storeId())
        .last("limit 1")
    );
    if (binding == null || !"ACTIVE".equals(binding.getStatus())) {
      throw new ApiException("STORE_BINDING_NOT_FOUND", "当前会员未绑定该门店", HttpStatus.NOT_FOUND);
    }

    StoreEntity store = storeMapper.selectOne(
      new LambdaQueryWrapper<StoreEntity>()
        .eq(StoreEntity::getId, request.storeId())
        .apply("\"status\" = 'ACTIVE'")
        .last("limit 1")
    );
    if (store == null) {
      throw new ApiException("STORE_NOT_AVAILABLE", "当前门店不可用", HttpStatus.CONFLICT);
    }

    UserEntity user = userMapper.selectById(session.userId());
    if (user == null) {
      throw new ApiException("USER_NOT_FOUND", "会员不存在", HttpStatus.NOT_FOUND);
    }

    LocalDateTime now = LocalDateTime.now();
    memberStoreBindingMapper.clearDefaultForUser(session.userId(), now);
    memberStoreBindingMapper.markDefaultForUserStore(session.userId(), store.getId(), now);
    userMapper.updateDefaultStore(session.userId(), store.getId(), now);
    binding.setIsDefault(true);

    String token = miniAuthService.createSessionToken(user.getId(), user.getOpenid(), store.getId());
    return new MiniStoreSwitchResponse(toMemberStoreDto(store, binding, store.getId()), token);
  }

  private MiniMemberStoreDto toMemberStoreDto(
    StoreEntity store,
    MemberStoreBindingEntity binding,
    String currentStoreId
  ) {
    return new MiniMemberStoreDto(
      store.getCode(),
      store.getCustomerServiceTel(),
      store.getId(),
      store.getId().equals(currentStoreId),
      Boolean.TRUE.equals(binding.getIsDefault()),
      store.getName(),
      store.getType()
    );
  }

  private String readJsonText(String value) {
    if (value == null || value.isBlank()) {
      return "";
    }
    try {
      JsonNode node = objectMapper.readTree(value);
      return node.isTextual() ? node.asText() : "";
    } catch (JsonProcessingException exception) {
      return value;
    }
  }
}
