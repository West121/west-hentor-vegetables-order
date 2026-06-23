package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniAccountCancelRequest;
import cn.hentor.vegetables.dto.MiniAccountCancelResponse;
import cn.hentor.vegetables.dto.MiniAccountCancelResultDto;
import cn.hentor.vegetables.dto.MiniAccountMemberDto;
import cn.hentor.vegetables.dto.MiniAccountUpdateRequest;
import cn.hentor.vegetables.dto.MiniAccountUpdateResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MiniAccountService {
  private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final MiniAuthService miniAuthService;
  private final ObjectMapper objectMapper;
  private final UserMapper userMapper;

  public MiniAccountService(
    AdminOperationLogMapper adminOperationLogMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    MiniAuthService miniAuthService,
    ObjectMapper objectMapper,
    UserMapper userMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.miniAuthService = miniAuthService;
    this.objectMapper = objectMapper;
    this.userMapper = userMapper;
  }

  @Transactional
  public MiniAccountUpdateResponse updateProfile(MiniSessionContext session, MiniAccountUpdateRequest request) {
    long startedAt = System.currentTimeMillis();
    String nickname = normalizeNickname(request.nickname());
    StoreEntity store = miniAuthService.findAvailableStore(request.storeCode());
    UserEntity before = userMapper.selectById(session.userId());
    if (before == null) {
      throw new ApiException("USER_NOT_FOUND", "会员不存在", HttpStatus.NOT_FOUND);
    }

    LocalDateTime now = LocalDateTime.now(BUSINESS_ZONE);
    userMapper.updateMiniNickname(before.getId(), nickname, now);
    UserEntity after = userMapper.selectById(before.getId());

    writeLog(
      "MINIAPP_PROFILE_UPDATED",
      "miniapp_profile",
      before.getId(),
      store.getId(),
      before.getId(),
      Map.of("nickname", before.getNickname() == null ? "" : before.getNickname()),
      Map.of("nickname", after.getNickname() == null ? "" : after.getNickname()),
      Map.of("nickname", nickname, "storeCode", request.storeCode() == null ? "" : request.storeCode()),
      Map.of("member", Map.of("id", after.getId(), "nickname", after.getNickname() == null ? "" : after.getNickname())),
      "PATCH",
      "/api/spring/v1/account",
      (int) (System.currentTimeMillis() - startedAt)
    );

    return new MiniAccountUpdateResponse(
      new MiniAccountMemberDto(after.getId(), after.getNickname(), after.getPhone())
    );
  }

  @Transactional
  public MiniAccountCancelResponse cancelAccount(MiniSessionContext session, MiniAccountCancelRequest request) {
    String reason = normalizeRequiredText(
      request.reason() == null ? "用户主动注销" : request.reason(),
      "CANCEL_ACCOUNT_REASON_REQUIRED",
      "请填写注销原因"
    );
    StoreEntity store = miniAuthService.findAvailableStore(request.storeCode());
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getStoreId, store.getId())
        .eq(MemberStoreBindingEntity::getUserId, session.userId())
        .last("limit 1")
    );
    if (binding == null) {
      throw new ApiException("STORE_REQUIRED", "请先绑定当前门店后再注销账号", HttpStatus.NOT_FOUND);
    }

    LocalDateTime now = LocalDateTime.now(BUSINESS_ZONE);
    userMapper.disableMiniAccount(session.userId(), reason, now);
    MemberStoreBindingEntity bindingUpdate = new MemberStoreBindingEntity();
    bindingUpdate.setId(binding.getId());
    bindingUpdate.setUpdatedAt(now);
    memberStoreBindingMapper.disableMiniBinding(bindingUpdate);

    MiniAccountCancelResultDto result = new MiniAccountCancelResultDto(
      "DISABLED",
      reason,
      "DISABLED",
      store.getId(),
      session.userId()
    );

    writeLog(
      "MINIAPP_ACCOUNT_CANCELED",
      "miniapp_account",
      session.userId(),
      store.getId(),
      session.userId(),
      Map.of("bindingStatus", binding.getStatus()),
      result,
      Map.of("reason", reason, "storeCode", request.storeCode() == null ? "" : request.storeCode()),
      Map.of("account", result),
      "DELETE",
      "/api/spring/v1/account",
      null
    );

    return new MiniAccountCancelResponse(result);
  }

  private String normalizeNickname(String value) {
    String nickname = normalizeRequiredText(value, "INVALID_PARAMS", "昵称不能为空，最多 24 个字符");
    if (nickname.length() > 24) {
      throw new ApiException("INVALID_PARAMS", "昵称不能为空，最多 24 个字符", HttpStatus.BAD_REQUEST);
    }
    return nickname;
  }

  private String normalizeRequiredText(String value, String code, String message) {
    String normalized = value == null ? "" : value.trim();
    if (!StringUtils.hasText(normalized)) {
      throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private void writeLog(
    String action,
    String resource,
    String resourceId,
    String storeId,
    String userId,
    Object beforeValue,
    Object afterValue,
    Object requestParams,
    Object responseData,
    String requestMethod,
    String requestPath,
    Integer durationMs
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setAction(action);
    log.setResource(resource);
    log.setResourceId(resourceId);
    log.setStoreId(storeId);
    log.setUserId(userId);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams(toJson(requestParams));
    log.setResponseData(toJson(responseData));
    log.setRequestMethod(requestMethod);
    log.setRequestPath(requestPath);
    log.setStatusCode(200);
    log.setDurationMs(durationMs);
    log.setCreatedAt(LocalDateTime.now(BUSINESS_ZONE));
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
