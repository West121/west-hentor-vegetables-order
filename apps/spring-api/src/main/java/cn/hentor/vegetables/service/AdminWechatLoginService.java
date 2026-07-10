package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.AdminWechatLoginProperties;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.AdminWechatStatusDto;
import cn.hentor.vegetables.dto.WechatLoginSessionDto;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.AdminWechatBindingEntity;
import cn.hentor.vegetables.mapper.AdminWechatBindingMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AdminWechatLoginService {
  static final String STATE_KEY_PREFIX = "hentor:spring:admin-wechat-state:";
  static final String BIND_KEY_PREFIX = "hentor:spring:admin-wechat-bind:";
  private static final Duration ONE_TIME_TTL = Duration.ofMinutes(5);

  private final AdminAuthService adminAuthService;
  private final AdminWechatBindingMapper bindingMapper;
  private final AdminWechatLoginProperties properties;
  private final AdminWechatProviderClient providerClient;
  private final ObjectMapper objectMapper;
  private final SessionStore sessionStore;

  public AdminWechatLoginService(
    AdminAuthService adminAuthService,
    AdminWechatBindingMapper bindingMapper,
    AdminWechatLoginProperties properties,
    AdminWechatProviderClient providerClient,
    ObjectMapper objectMapper,
    SessionStore sessionStore
  ) {
    this.adminAuthService = adminAuthService;
    this.bindingMapper = bindingMapper;
    this.properties = properties;
    this.providerClient = providerClient;
    this.objectMapper = objectMapper;
    this.sessionStore = sessionStore;
  }

  public AdminWechatStatusDto status() {
    return new AdminWechatStatusDto(isEnabled());
  }

  public String startAuthorization() {
    ensureEnabled();
    String state = UUID.randomUUID().toString().replace("-", "");
    sessionStore.set(stateKey(state), "pending", ONE_TIME_TTL);
    return providerClient.authorizationUrl(state);
  }

  public AdminWechatLoginResult complete(String code, String state) {
    if (!StringUtils.hasText(code) || !StringUtils.hasText(state)) {
      throw invalidCallback();
    }
    String pendingState = sessionStore.get(stateKey(state));
    sessionStore.delete(stateKey(state));
    if (!"pending".equals(pendingState)) {
      throw invalidCallback();
    }

    WechatLoginSessionDto identity = providerClient.exchangeCode(code);
    AdminWechatBindingEntity binding = bindingMapper.selectOne(
      new LambdaQueryWrapper<AdminWechatBindingEntity>()
        .eq(AdminWechatBindingEntity::getOpenid, identity.openid())
    );
    if (binding == null) {
      String bindToken = UUID.randomUUID().toString().replace("-", "");
      sessionStore.set(bindKey(bindToken), serialize(identity), ONE_TIME_TTL);
      return new AdminWechatLoginResult(null, bindToken);
    }

    AdminUserEntity admin = requireActiveAdmin(binding.getAdminUserId());
    binding.setLastLoginAt(LocalDateTime.now());
    binding.setUpdatedAt(LocalDateTime.now());
    bindingMapper.updateById(binding);
    return new AdminWechatLoginResult(adminAuthService.createSession(admin), null);
  }

  public AdminSessionDto bind(String bindToken, String username, String password) {
    if (!StringUtils.hasText(bindToken)) {
      throw new ApiException("WECHAT_BIND_EXPIRED", "微信绑定已过期，请重新扫码", HttpStatus.BAD_REQUEST);
    }
    String serializedIdentity = sessionStore.get(bindKey(bindToken));
    sessionStore.delete(bindKey(bindToken));
    if (!StringUtils.hasText(serializedIdentity)) {
      throw new ApiException("WECHAT_BIND_EXPIRED", "微信绑定已过期，请重新扫码", HttpStatus.BAD_REQUEST);
    }

    WechatLoginSessionDto identity = deserialize(serializedIdentity);
    AdminUserEntity admin = adminAuthService.authenticateCredentials(username, password);
    if (bindingMapper.selectOne(
      new LambdaQueryWrapper<AdminWechatBindingEntity>()
        .eq(AdminWechatBindingEntity::getOpenid, identity.openid())
    ) != null) {
      throw new ApiException("WECHAT_ALREADY_BOUND", "该微信已绑定其他后台账号", HttpStatus.CONFLICT);
    }
    if (bindingMapper.selectOne(
      new LambdaQueryWrapper<AdminWechatBindingEntity>()
        .eq(AdminWechatBindingEntity::getAdminUserId, admin.getId())
    ) != null) {
      throw new ApiException("ADMIN_WECHAT_ALREADY_BOUND", "该后台账号已绑定微信", HttpStatus.CONFLICT);
    }

    LocalDateTime now = LocalDateTime.now();
    AdminWechatBindingEntity binding = new AdminWechatBindingEntity();
    binding.setId(UUID.randomUUID().toString().replace("-", ""));
    binding.setAdminUserId(admin.getId());
    binding.setOpenid(identity.openid());
    binding.setUnionid(identity.unionid());
    binding.setLastLoginAt(now);
    binding.setCreatedAt(now);
    binding.setUpdatedAt(now);
    bindingMapper.insert(binding);
    return adminAuthService.createSession(admin);
  }

  private boolean isEnabled() {
    return properties.isMockEnabled() || properties.isConfigured();
  }

  private void ensureEnabled() {
    if (!isEnabled()) {
      throw new ApiException("WECHAT_OPEN_CONFIG_REQUIRED", "微信网站应用尚未配置", HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private AdminUserEntity requireActiveAdmin(String adminUserId) {
    AdminUserEntity admin = adminAuthService.findAdmin(adminUserId);
    if (admin == null || !"ACTIVE".equals(admin.getStatus())) {
      throw new ApiException("WECHAT_ADMIN_DISABLED", "后台账号已停用，请联系管理员", HttpStatus.FORBIDDEN);
    }
    return admin;
  }

  private ApiException invalidCallback() {
    return new ApiException("WECHAT_CALLBACK_INVALID", "微信登录回调无效，请重新扫码", HttpStatus.BAD_REQUEST);
  }

  private String stateKey(String state) { return STATE_KEY_PREFIX + state; }
  private String bindKey(String token) { return BIND_KEY_PREFIX + token; }

  private String serialize(WechatLoginSessionDto identity) {
    try {
      return objectMapper.writeValueAsString(identity);
    } catch (JsonProcessingException exception) {
      throw new ApiException("WECHAT_BIND_FAILED", "微信绑定失败，请重新扫码", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private WechatLoginSessionDto deserialize(String value) {
    try {
      return objectMapper.readValue(value, WechatLoginSessionDto.class);
    } catch (JsonProcessingException exception) {
      throw new ApiException("WECHAT_BIND_FAILED", "微信绑定失败，请重新扫码", HttpStatus.BAD_REQUEST);
    }
  }

  public record AdminWechatLoginResult(AdminSessionDto session, String bindToken) {
    public boolean requiresBinding() { return StringUtils.hasText(bindToken); }
  }
}
