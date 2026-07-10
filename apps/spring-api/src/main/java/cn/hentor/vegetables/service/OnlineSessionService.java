package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.OnlineSessionItemDto;
import cn.hentor.vegetables.dto.OnlineSessionKickResponse;
import cn.hentor.vegetables.dto.OnlineSessionListResponse;
import cn.hentor.vegetables.dto.OnlineSessionSummaryDto;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class OnlineSessionService {
  private final AdminUserMapper adminUserMapper;
  private final SessionStore sessionStore;
  private final StoreMapper storeMapper;
  private final UserMapper userMapper;

  public OnlineSessionService(
    AdminUserMapper adminUserMapper,
    SessionStore sessionStore,
    StoreMapper storeMapper,
    UserMapper userMapper
  ) {
    this.adminUserMapper = adminUserMapper;
    this.sessionStore = sessionStore;
    this.storeMapper = storeMapper;
    this.userMapper = userMapper;
  }

  public OnlineSessionListResponse list(AdminSessionDto currentSession, String type) {
    List<OnlineSessionItemDto> adminItems = shouldInclude(type, "admin")
      ? listAdminSessions(currentSession)
      : List.of();
    List<OnlineSessionItemDto> miniItems = shouldInclude(type, "mini")
      ? listMiniSessions()
      : List.of();

    List<OnlineSessionItemDto> items = new ArrayList<>();
    items.addAll(adminItems);
    items.addAll(miniItems);
    items.sort(
      Comparator
        .comparing(OnlineSessionItemDto::current)
        .reversed()
        .thenComparing(OnlineSessionItemDto::type)
        .thenComparing(item -> item.displayName() == null ? "" : item.displayName())
    );

    return new OnlineSessionListResponse(
      items,
      new OnlineSessionSummaryDto(adminItems.size(), miniItems.size(), items.size())
    );
  }

  public OnlineSessionKickResponse kick(String sessionId) {
    String key = decodeSessionId(sessionId);
    if (!key.startsWith(AdminAuthService.SESSION_KEY_PREFIX) && !key.startsWith(MiniAuthService.SESSION_KEY_PREFIX)) {
      throw new ApiException("INVALID_SESSION", "会话不存在或已过期", HttpStatus.NOT_FOUND);
    }
    sessionStore.delete(key);
    return new OnlineSessionKickResponse(sessionId, true);
  }

  private List<OnlineSessionItemDto> listAdminSessions(AdminSessionDto currentSession) {
    List<SessionStore.SessionEntry> entries = sessionStore.scan(AdminAuthService.SESSION_KEY_PREFIX);
    List<String> adminUserIds = entries
      .stream()
      .map(SessionStore.SessionEntry::value)
      .filter(StringUtils::hasText)
      .distinct()
      .toList();
    Map<String, AdminUserEntity> adminMap = adminUserIds.isEmpty()
      ? Map.of()
      : adminUserMapper.selectBatchIds(adminUserIds)
        .stream()
        .collect(Collectors.toMap(AdminUserEntity::getId, Function.identity()));

    return entries
      .stream()
      .map(entry -> {
        AdminUserEntity user = adminMap.get(entry.value());
        String token = entry.key().substring(AdminAuthService.SESSION_KEY_PREFIX.length());
        return new OnlineSessionItemDto(
          Objects.equals(currentSession.token(), token),
          user == null ? "未知后台用户" : user.getName(),
          toLocalDateTime(entry.expiresAt()),
          encodeSessionId(entry.key()),
          user == null ? null : user.getPhone(),
          null,
          "admin",
          "后台用户",
          entry.value(),
          user == null ? null : user.getUsername()
        );
      })
      .toList();
  }

  private List<OnlineSessionItemDto> listMiniSessions() {
    List<SessionStore.SessionEntry> entries = sessionStore.scan(MiniAuthService.SESSION_KEY_PREFIX);
    List<MiniSessionValue> values = entries
      .stream()
      .map(entry -> parseMiniSession(entry.key(), entry.value(), entry.expiresAt()))
      .filter(Objects::nonNull)
      .toList();
    List<String> userIds = values.stream().map(MiniSessionValue::userId).filter(StringUtils::hasText).distinct().toList();
    List<String> storeIds = values.stream().map(MiniSessionValue::storeId).filter(StringUtils::hasText).distinct().toList();
    Map<String, UserEntity> userMap = userIds.isEmpty()
      ? Map.of()
      : userMapper.selectBatchIds(userIds)
        .stream()
        .collect(Collectors.toMap(UserEntity::getId, Function.identity()));
    Map<String, StoreEntity> storeMap = storeIds.isEmpty()
      ? Map.of()
      : storeMapper.selectBatchIds(storeIds)
        .stream()
        .collect(Collectors.toMap(StoreEntity::getId, Function.identity()));

    return values
      .stream()
      .map(value -> {
        UserEntity user = userMap.get(value.userId());
        StoreEntity store = storeMap.get(value.storeId());
        return new OnlineSessionItemDto(
          false,
          user == null || !StringUtils.hasText(user.getNickname()) ? "小程序用户" : user.getNickname(),
          toLocalDateTime(value.expiresAt()),
          encodeSessionId(value.key()),
          user == null ? null : user.getPhone(),
          store == null ? null : store.getName(),
          "mini",
          "小程序用户",
          value.userId(),
          user == null ? value.openid() : user.getOpenid()
        );
      })
      .toList();
  }

  private boolean shouldInclude(String type, String target) {
    if (!StringUtils.hasText(type) || "all".equals(type)) {
      return true;
    }
    return target.equals(type);
  }

  private MiniSessionValue parseMiniSession(String key, String rawValue, java.time.Instant expiresAt) {
    String[] parts = rawValue.split("\\|", -1);
    if (parts.length < 3 || !StringUtils.hasText(parts[0])) {
      return null;
    }
    return new MiniSessionValue(key, parts[0], parts[1], parts[2], expiresAt);
  }

  private LocalDateTime toLocalDateTime(java.time.Instant instant) {
    return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
  }

  private String encodeSessionId(String key) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(key.getBytes(StandardCharsets.UTF_8));
  }

  private String decodeSessionId(String sessionId) {
    try {
      return new String(Base64.getUrlDecoder().decode(sessionId), StandardCharsets.UTF_8);
    } catch (IllegalArgumentException error) {
      throw new ApiException("INVALID_SESSION", "会话不存在或已过期", HttpStatus.NOT_FOUND);
    }
  }

  private record MiniSessionValue(
    String key,
    String userId,
    String openid,
    String storeId,
    java.time.Instant expiresAt
  ) {}
}
