package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniDevLoginRequest;
import cn.hentor.vegetables.dto.MiniLoginResponse;
import cn.hentor.vegetables.dto.MiniLoginUserDto;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.dto.MiniStoreDto;
import cn.hentor.vegetables.dto.MiniWxPhoneLoginRequest;
import cn.hentor.vegetables.dto.MiniWxSessionLoginRequest;
import cn.hentor.vegetables.dto.WechatLoginSessionDto;
import cn.hentor.vegetables.dto.WechatPhoneDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.SystemConfigEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.mapper.SystemConfigMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.util.LinkedHashMap;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class MiniAuthService {
  private static final int DEFAULT_HOME_DISH_COLUMNS = 3;
  private static final Duration SESSION_TTL = Duration.ofDays(30);
  private static final String SESSION_KEY_PREFIX = "hentor:spring:mini-session:";

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final ObjectMapper objectMapper;
  private final StoreMapper storeMapper;
  private final SystemConfigMapper systemConfigMapper;
  private final SessionStore sessionStore;
  private final UserMapper userMapper;
  private final WechatMiniappService wechatMiniappService;

  public MiniAuthService(
    AdminOperationLogMapper adminOperationLogMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    ObjectMapper objectMapper,
    StoreMapper storeMapper,
    SystemConfigMapper systemConfigMapper,
    SessionStore sessionStore,
    UserMapper userMapper,
    WechatMiniappService wechatMiniappService
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.objectMapper = objectMapper;
    this.storeMapper = storeMapper;
    this.systemConfigMapper = systemConfigMapper;
    this.sessionStore = sessionStore;
    this.userMapper = userMapper;
    this.wechatMiniappService = wechatMiniappService;
  }

  public MiniLoginResponse devLogin(MiniDevLoginRequest request) {
    StoreEntity store = findAvailableStore(request.storeCode());
    UserEntity user = userMapper.selectOne(
      new LambdaQueryWrapper<UserEntity>()
        .eq(UserEntity::getPhone, request.phone().trim())
        .last("limit 1")
    );

    if (user == null) {
      throw new ApiException("USER_NOT_FOUND", "手机号未导入会员", HttpStatus.NOT_FOUND);
    }

    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, user.getId())
        .eq(MemberStoreBindingEntity::getStoreId, store.getId())
        .last("limit 1")
    );

    if (binding == null) {
      throw new ApiException("MEMBER_STORE_NOT_FOUND", "当前门店会员不存在", HttpStatus.NOT_FOUND);
    }

    String token = createSessionToken(user.getId(), user.getOpenid(), store.getId());

    return new MiniLoginResponse(
      token,
      new MiniLoginUserDto(user.getId(), user.getPhone(), user.getNickname(), store.getId()),
      toStoreDto(store)
    );
  }

  public MiniLoginResponse wxPhoneLogin(MiniWxPhoneLoginRequest request, HttpServletRequest servletRequest) {
    long startedAt = System.currentTimeMillis();
    WechatLoginSessionDto wechatSession = wechatMiniappService.exchangeLoginCode(request.loginCode().trim());
    WechatPhoneDto phoneInfo = wechatMiniappService.exchangePhoneCode(request.phoneCode().trim());
    StoreEntity store = findAvailableStore(request.storeCode());
    UserEntity user = upsertWechatPhoneUser(
      store.getId(),
      wechatSession.openid(),
      phoneInfo.phone(),
      wechatSession.unionid()
    );
    upsertWechatBinding(user, store);

    String token = createSessionToken(user.getId(), user.getOpenid(), store.getId());
    MiniLoginResponse response = new MiniLoginResponse(
      token,
      new MiniLoginUserDto(user.getId(), user.getPhone(), user.getNickname(), store.getId()),
      toStoreDto(store)
    );
    writePhoneLoginLog(
      request,
      response,
      store,
      user,
      servletRequest,
      Math.toIntExact(Math.min(System.currentTimeMillis() - startedAt, Integer.MAX_VALUE))
    );
    return response;
  }

  public MiniLoginResponse wxSessionLogin(MiniWxSessionLoginRequest request, HttpServletRequest servletRequest) {
    long startedAt = System.currentTimeMillis();
    WechatLoginSessionDto wechatSession = wechatMiniappService.exchangeLoginCode(request.loginCode().trim());
    StoreEntity store = findAvailableStore(request.storeCode());
    UserEntity user = userMapper.selectOne(
      new LambdaQueryWrapper<UserEntity>()
        .eq(UserEntity::getOpenid, wechatSession.openid())
        .last("limit 1")
    );
    if (user == null) {
      throw new ApiException("WECHAT_SESSION_UNBOUND", "请先使用手机号登录", HttpStatus.UNAUTHORIZED);
    }

    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, user.getId())
        .eq(MemberStoreBindingEntity::getStoreId, store.getId())
        .last("limit 1")
    );
    if (binding == null) {
      throw new ApiException("MEMBER_STORE_NOT_FOUND", "当前门店会员不存在", HttpStatus.UNAUTHORIZED);
    }

    String token = createSessionToken(user.getId(), user.getOpenid(), store.getId());
    MiniLoginResponse response = new MiniLoginResponse(
      token,
      new MiniLoginUserDto(user.getId(), user.getPhone(), user.getNickname(), store.getId()),
      toStoreDto(store)
    );
    writeSessionRefreshLog(
      request,
      response,
      store,
      user,
      servletRequest,
      Math.toIntExact(Math.min(System.currentTimeMillis() - startedAt, Integer.MAX_VALUE))
    );
    return response;
  }

  public MiniSessionContext requireSession(String authorization) {
    String token = resolveBearerToken(authorization);
    if (!StringUtils.hasText(token)) {
      throw new ApiException("UNAUTHORIZED", "请先登录", HttpStatus.UNAUTHORIZED);
    }

    String raw = sessionStore.get(sessionKey(token));
    if (!StringUtils.hasText(raw)) {
      throw new ApiException("UNAUTHORIZED", "登录已过期，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    String[] parts = raw.split("\\|", -1);
    if (parts.length != 3) {
      sessionStore.delete(sessionKey(token));
      throw new ApiException("UNAUTHORIZED", "登录已过期，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    sessionStore.expire(sessionKey(token), SESSION_TTL);
    return new MiniSessionContext(token, parts[0], parts[1], parts[2]);
  }

  public StoreEntity findAvailableStore(String storeCode) {
    String normalizedCode = StringUtils.hasText(storeCode) ? storeCode.trim() : "lotus-garden";
    StoreEntity store = storeMapper.selectOne(
      new LambdaQueryWrapper<StoreEntity>()
        .eq(StoreEntity::getCode, normalizedCode)
        .apply("\"status\" = 'ACTIVE'")
        .last("limit 1")
    );
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "当前门店不可用", HttpStatus.NOT_FOUND);
    }
    return store;
  }

  public StoreEntity findAvailableStore(String storeId, String storeCode) {
    LambdaQueryWrapper<StoreEntity> wrapper = new LambdaQueryWrapper<StoreEntity>()
      .eq(StoreEntity::getId, storeId)
      .apply("\"status\" = 'ACTIVE'");
    if (StringUtils.hasText(storeCode)) {
      wrapper.eq(StoreEntity::getCode, storeCode.trim());
    }
    StoreEntity store = storeMapper.selectOne(wrapper.last("limit 1"));
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "当前门店不可用", HttpStatus.NOT_FOUND);
    }
    return store;
  }

  public String createSessionToken(String userId, String openid, String storeId) {
    String token = UUID.randomUUID().toString().replace("-", "");
    sessionStore.set(sessionKey(token), String.join("|", userId, openid == null ? "" : openid, storeId), SESSION_TTL);
    return token;
  }

  public MiniStoreDto toStoreDto(StoreEntity store) {
    List<String> deliveryCities = DeliveryRangeSupport.readJsonStringArray(objectMapper, store.getDeliveryCities());
    List<String> deliveryProvinces = DeliveryRangeSupport.readJsonStringArray(
      objectMapper,
      store.getDeliveryProvinces()
    );
    return new MiniStoreDto(
      store.getId(),
      store.getCode(),
      store.getName(),
      store.getCutoffTime(),
      store.getCustomerServiceTel(),
      deliveryCities,
      deliveryProvinces,
      readHomeDishColumns(store.getId())
    );
  }

  private int readHomeDishColumns(String storeId) {
    SystemConfigEntity config = systemConfigMapper.selectOne(
      new LambdaQueryWrapper<SystemConfigEntity>()
        .eq(SystemConfigEntity::getStoreId, storeId)
        .eq(SystemConfigEntity::getKey, "home_dish_columns")
        .last("limit 1")
    );
    String value = readJsonText(config == null ? null : config.getValue());
    if (!StringUtils.hasText(value) && config != null) {
      value = config.getValue() == null ? "" : config.getValue().trim();
    }
    if (!StringUtils.hasText(value)) {
      return DEFAULT_HOME_DISH_COLUMNS;
    }
    try {
      int columns = Integer.parseInt(value.trim());
      return columns == 2 || columns == 3 || columns == 4
        ? columns
        : DEFAULT_HOME_DISH_COLUMNS;
    } catch (NumberFormatException exception) {
      return DEFAULT_HOME_DISH_COLUMNS;
    }
  }

  private UserEntity upsertWechatPhoneUser(
    String defaultStoreId,
    String openid,
    String phone,
    String unionid
  ) {
    LocalDateTime now = LocalDateTime.now();
    UserEntity existingWechatUser = userMapper.selectOne(
      new LambdaQueryWrapper<UserEntity>()
        .eq(UserEntity::getOpenid, openid)
        .last("limit 1")
    );
    if (existingWechatUser != null) {
      existingWechatUser.setDefaultStoreId(defaultStoreId);
      existingWechatUser.setPhone(phone);
      existingWechatUser.setUnionid(unionid);
      existingWechatUser.setUpdatedAt(now);
      userMapper.updateWechatUser(existingWechatUser);
      return userMapper.selectById(existingWechatUser.getId());
    }

    UserEntity importedUser = userMapper.selectOne(
      new LambdaQueryWrapper<UserEntity>()
        .likeRight(UserEntity::getOpenid, "imported-phone:")
        .eq(UserEntity::getPhone, phone)
        .orderByAsc(UserEntity::getCreatedAt)
        .last("limit 1")
    );
    if (importedUser != null) {
      importedUser.setDefaultStoreId(defaultStoreId);
      importedUser.setOpenid(openid);
      importedUser.setPhone(phone);
      importedUser.setUnionid(unionid);
      importedUser.setUpdatedAt(now);
      userMapper.updateWechatUser(importedUser);
      return userMapper.selectById(importedUser.getId());
    }

    UserEntity user = new UserEntity();
    user.setId(id());
    user.setDefaultStoreId(defaultStoreId);
    user.setOpenid(openid);
    user.setPhone(phone);
    user.setUnionid(unionid);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    userMapper.insertWechatUser(user);
    return userMapper.selectById(user.getId());
  }

  private void upsertWechatBinding(UserEntity user, StoreEntity store) {
    LocalDateTime now = LocalDateTime.now();
    String status = "DISABLED".equals(user.getStatus()) ? "DISABLED" : "ACTIVE";
    memberStoreBindingMapper.clearDefaultForUser(user.getId(), now);
    userMapper.updateDefaultStore(user.getId(), store.getId(), now);

    MemberStoreBindingEntity existingBinding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, user.getId())
        .eq(MemberStoreBindingEntity::getStoreId, store.getId())
        .last("limit 1")
    );
    if (existingBinding == null) {
      MemberStoreBindingEntity binding = new MemberStoreBindingEntity();
      binding.setId(id());
      binding.setUserId(user.getId());
      binding.setStoreId(store.getId());
      binding.setStatus(status);
      binding.setSource("wechat_login");
      binding.setIsDefault(true);
      binding.setCreatedAt(now);
      binding.setUpdatedAt(now);
      memberStoreBindingMapper.insertAdminBinding(binding);
      return;
    }

    existingBinding.setStatus(status);
    existingBinding.setIsDefault(true);
    existingBinding.setUpdatedAt(now);
    memberStoreBindingMapper.updateAdminBinding(existingBinding);
  }

  private void writePhoneLoginLog(
    MiniWxPhoneLoginRequest request,
    MiniLoginResponse response,
    StoreEntity store,
    UserEntity user,
    HttpServletRequest servletRequest,
    Integer durationMs
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setAction("MINIAPP_PHONE_LOGIN");
    log.setResource("miniapp_session");
    log.setResourceId(user.getId());
    log.setStoreId(store.getId());
    log.setUserId(user.getId());
    log.setBeforeValue("null");
    Map<String, Object> afterValue = new LinkedHashMap<>();
    afterValue.put("phone", maskPhone(user.getPhone()));
    afterValue.put("storeCode", store.getCode());
    log.setAfterValue(toJson(afterValue));

    Map<String, Object> requestParams = new LinkedHashMap<>();
    requestParams.put("loginCode", StringUtils.hasText(request.loginCode()) ? "[provided]" : "[missing]");
    requestParams.put("phoneCode", StringUtils.hasText(request.phoneCode()) ? "[provided]" : "[missing]");
    requestParams.put("storeCode", request.storeCode());
    log.setRequestParams(toJson(requestParams));

    Map<String, Object> responseData = new LinkedHashMap<>();
    Map<String, Object> responseStore = new LinkedHashMap<>();
    responseStore.put("code", store.getCode());
    responseStore.put("id", store.getId());
    responseStore.put("name", store.getName());
    Map<String, Object> responseUser = new LinkedHashMap<>();
    responseUser.put("defaultStoreId", store.getId());
    responseUser.put("id", user.getId());
    responseUser.put("nickname", user.getNickname());
    responseUser.put("phone", maskPhone(user.getPhone()));
    responseData.put("store", responseStore);
    responseData.put("success", true);
    responseData.put("token", "[issued]");
    responseData.put("user", responseUser);
    log.setResponseData(toJson(responseData));
    log.setRequestMethod(servletRequest == null ? "POST" : servletRequest.getMethod());
    log.setRequestPath(servletRequest == null ? "/api/spring/v1/auth/wx-phone" : servletRequest.getRequestURI());
    log.setStatusCode(200);
    log.setDurationMs(durationMs);
    log.setIp(resolveIp(servletRequest));
    log.setUserAgent(servletRequest == null ? null : servletRequest.getHeader("user-agent"));
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private void writeSessionRefreshLog(
    MiniWxSessionLoginRequest request,
    MiniLoginResponse response,
    StoreEntity store,
    UserEntity user,
    HttpServletRequest servletRequest,
    Integer durationMs
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setAction("MINIAPP_SESSION_REFRESH");
    log.setResource("miniapp_session");
    log.setResourceId(user.getId());
    log.setStoreId(store.getId());
    log.setUserId(user.getId());
    log.setBeforeValue("null");

    Map<String, Object> afterValue = new LinkedHashMap<>();
    afterValue.put("phone", maskPhone(user.getPhone()));
    afterValue.put("storeCode", store.getCode());
    log.setAfterValue(toJson(afterValue));

    Map<String, Object> requestParams = new LinkedHashMap<>();
    requestParams.put("loginCode", StringUtils.hasText(request.loginCode()) ? "[provided]" : "[missing]");
    requestParams.put("storeCode", request.storeCode());
    log.setRequestParams(toJson(requestParams));

    Map<String, Object> responseData = new LinkedHashMap<>();
    Map<String, Object> responseStore = new LinkedHashMap<>();
    responseStore.put("code", store.getCode());
    responseStore.put("id", store.getId());
    responseStore.put("name", store.getName());
    Map<String, Object> responseUser = new LinkedHashMap<>();
    responseUser.put("defaultStoreId", store.getId());
    responseUser.put("id", user.getId());
    responseUser.put("nickname", user.getNickname());
    responseUser.put("phone", maskPhone(user.getPhone()));
    responseData.put("store", responseStore);
    responseData.put("success", true);
    responseData.put("token", "[issued]");
    responseData.put("user", responseUser);
    log.setResponseData(toJson(responseData));
    log.setRequestMethod(servletRequest == null ? "POST" : servletRequest.getMethod());
    log.setRequestPath(servletRequest == null ? "/api/spring/v1/auth/wx-session" : servletRequest.getRequestURI());
    log.setStatusCode(200);
    log.setDurationMs(durationMs);
    log.setIp(resolveIp(servletRequest));
    log.setUserAgent(servletRequest == null ? null : servletRequest.getHeader("user-agent"));
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private String resolveIp(HttpServletRequest servletRequest) {
    if (servletRequest == null) {
      return null;
    }
    String forwardedFor = servletRequest.getHeader("x-forwarded-for");
    if (StringUtils.hasText(forwardedFor)) {
      return forwardedFor.split(",")[0].trim();
    }
    return servletRequest.getRemoteAddr();
  }

  private String maskPhone(String phone) {
    if (!StringUtils.hasText(phone) || phone.length() < 7) {
      return phone;
    }
    return phone.replaceFirst("^(\\d{3})\\d{4}(\\d{4})$", "$1****$2");
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

  private String toJson(Object value) {
    try {
      return value == null ? "null" : objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      return "{}";
    }
  }

  private String resolveBearerToken(String authorization) {
    if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
      return authorization.substring("Bearer ".length()).trim();
    }
    return null;
  }

  private String sessionKey(String token) {
    return SESSION_KEY_PREFIX + token;
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }
}
