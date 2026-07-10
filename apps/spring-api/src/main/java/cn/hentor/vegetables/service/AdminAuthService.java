package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.AdminLoginRequest;
import cn.hentor.vegetables.dto.AdminPasswordChangeRequest;
import cn.hentor.vegetables.dto.AdminRoleDto;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.entity.AdminPermissionEntity;
import cn.hentor.vegetables.entity.AdminRoleEntity;
import cn.hentor.vegetables.entity.AdminRolePermissionEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.AdminUserRoleEntity;
import cn.hentor.vegetables.entity.AdminUserStoreEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.mapper.AdminPermissionMapper;
import cn.hentor.vegetables.mapper.AdminRoleMapper;
import cn.hentor.vegetables.mapper.AdminRolePermissionMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.AdminUserRoleMapper;
import cn.hentor.vegetables.mapper.AdminUserStoreMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AdminAuthService {
  public static final String SESSION_COOKIE = "hentor_spring_admin_session";
  public static final String SESSION_KEY_PREFIX = "hentor:spring:admin-session:";
  private static final Duration SESSION_TTL = Duration.ofDays(7);

  private final AdminPermissionMapper adminPermissionMapper;
  private final AdminRoleMapper adminRoleMapper;
  private final AdminRolePermissionMapper adminRolePermissionMapper;
  private final AdminUserMapper adminUserMapper;
  private final AdminUserRoleMapper adminUserRoleMapper;
  private final AdminUserStoreMapper adminUserStoreMapper;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
  private final StoreMapper storeMapper;
  private final SessionStore sessionStore;

  public AdminAuthService(
    AdminPermissionMapper adminPermissionMapper,
    AdminRoleMapper adminRoleMapper,
    AdminRolePermissionMapper adminRolePermissionMapper,
    AdminUserMapper adminUserMapper,
    AdminUserRoleMapper adminUserRoleMapper,
    AdminUserStoreMapper adminUserStoreMapper,
    StoreMapper storeMapper,
    SessionStore sessionStore
  ) {
    this.adminPermissionMapper = adminPermissionMapper;
    this.adminRoleMapper = adminRoleMapper;
    this.adminRolePermissionMapper = adminRolePermissionMapper;
    this.adminUserMapper = adminUserMapper;
    this.adminUserRoleMapper = adminUserRoleMapper;
    this.adminUserStoreMapper = adminUserStoreMapper;
    this.storeMapper = storeMapper;
    this.sessionStore = sessionStore;
  }

  public AdminSessionDto login(AdminLoginRequest request) {
    return createSession(authenticateCredentials(request.username(), request.password()));
  }

  AdminUserEntity authenticateCredentials(String username, String password) {
    AdminUserEntity admin = adminUserMapper.selectOne(
      new LambdaQueryWrapper<AdminUserEntity>().eq(AdminUserEntity::getUsername, username)
    );
    if (
      admin == null ||
      !"ACTIVE".equals(admin.getStatus()) ||
      !passwordEncoder.matches(password, admin.getPasswordHash())
    ) {
      throw new ApiException("LOGIN_FAILED", "账号或密码不正确", HttpStatus.UNAUTHORIZED);
    }
    return admin;
  }

  AdminUserEntity findAdmin(String adminUserId) {
    return adminUserMapper.selectById(adminUserId);
  }

  AdminSessionDto createSession(AdminUserEntity admin) {
    AdminUserEntity update = new AdminUserEntity();
    update.setId(admin.getId());
    update.setLastLoginAt(LocalDateTime.now());
    adminUserMapper.updateById(update);

    String token = UUID.randomUUID().toString().replace("-", "");
    sessionStore.set(sessionKey(token), admin.getId(), SESSION_TTL);

    return buildSession(token, admin);
  }

  public AdminSessionDto getSession(String token) {
    if (!StringUtils.hasText(token)) {
      throw new ApiException("UNAUTHORIZED", "请先登录", HttpStatus.UNAUTHORIZED);
    }

    String adminUserId = sessionStore.get(sessionKey(token));
    if (!StringUtils.hasText(adminUserId)) {
      throw new ApiException("UNAUTHORIZED", "登录已过期，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    AdminUserEntity admin = adminUserMapper.selectById(adminUserId);
    if (admin == null || !"ACTIVE".equals(admin.getStatus())) {
      sessionStore.delete(sessionKey(token));
      throw new ApiException("UNAUTHORIZED", "账号不可用，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    sessionStore.expire(sessionKey(token), SESSION_TTL);
    return buildSession(token, admin);
  }

  public void logout(String token) {
    if (StringUtils.hasText(token)) {
      sessionStore.delete(sessionKey(token));
    }
  }

  public void changePassword(AdminSessionDto session, AdminPasswordChangeRequest request) {
    if (!StringUtils.hasText(request.currentPassword())) {
      throw new ApiException("INVALID_CURRENT_PASSWORD", "请输入当前密码", HttpStatus.BAD_REQUEST);
    }
    if (!StringUtils.hasText(request.newPassword()) || request.newPassword().trim().length() < 8) {
      throw new ApiException("INVALID_NEW_PASSWORD", "新密码至少需要 8 位", HttpStatus.BAD_REQUEST);
    }
    if (request.currentPassword().equals(request.newPassword())) {
      throw new ApiException("SAME_PASSWORD", "新密码不能和当前密码相同", HttpStatus.BAD_REQUEST);
    }

    AdminUserEntity admin = adminUserMapper.selectById(session.adminUserId());
    if (admin == null || !"ACTIVE".equals(admin.getStatus())) {
      throw new ApiException("UNAUTHORIZED", "账号不可用，请重新登录", HttpStatus.UNAUTHORIZED);
    }
    if (!passwordEncoder.matches(request.currentPassword(), admin.getPasswordHash())) {
      throw new ApiException("CURRENT_PASSWORD_MISMATCH", "当前密码不正确", HttpStatus.BAD_REQUEST);
    }

    AdminUserEntity update = new AdminUserEntity();
    update.setId(admin.getId());
    update.setPasswordHash(passwordEncoder.encode(request.newPassword().trim()));
    update.setUpdatedAt(LocalDateTime.now());
    adminUserMapper.updateAdminUserPassword(update);
    invalidateAdminSessions(admin.getId(), session.token());
  }

  void invalidateAdminSessions(String adminUserId, String exceptToken) {
    for (SessionStore.SessionEntry entry : sessionStore.scan(SESSION_KEY_PREFIX)) {
      if (!adminUserId.equals(entry.value())) {
        continue;
      }
      String token = entry.key().substring(SESSION_KEY_PREFIX.length());
      if (StringUtils.hasText(exceptToken) && exceptToken.equals(token)) {
        continue;
      }
      sessionStore.delete(entry.key());
    }
  }

  private AdminSessionDto buildSession(String token, AdminUserEntity admin) {
    List<AdminRoleEntity> roles = loadRoles(admin.getId());
    List<String> roleIds = roles.stream().map(AdminRoleEntity::getId).toList();
    boolean hasAllStoreScope = roles.stream().anyMatch(role -> "super_admin".equals(role.getCode()));

    return new AdminSessionDto(
      token,
      admin.getId(),
      admin.getUsername(),
      admin.getName(),
      admin.getPhone(),
      roles.stream().map(role -> new AdminRoleDto(role.getId(), role.getCode(), role.getName())).toList(),
      loadPermissionCodes(roleIds),
      loadStores(admin.getId(), hasAllStoreScope),
      hasAllStoreScope ? "ALL" : "ASSIGNED",
      LocalDateTime.now().plus(SESSION_TTL)
    );
  }

  private List<AdminRoleEntity> loadRoles(String adminUserId) {
    List<AdminUserRoleEntity> links = adminUserRoleMapper.selectList(
      new LambdaQueryWrapper<AdminUserRoleEntity>().eq(AdminUserRoleEntity::getAdminUserId, adminUserId)
    );
    List<String> roleIds = links.stream().map(AdminUserRoleEntity::getRoleId).distinct().toList();
    if (roleIds.isEmpty()) {
      return List.of();
    }
    return adminRoleMapper.selectBatchIds(roleIds)
      .stream()
      .sorted(Comparator.comparing(AdminRoleEntity::getCreatedAt))
      .toList();
  }

  private List<String> loadPermissionCodes(List<String> roleIds) {
    if (roleIds.isEmpty()) {
      return List.of();
    }

    List<AdminRolePermissionEntity> links = adminRolePermissionMapper.selectList(
      new LambdaQueryWrapper<AdminRolePermissionEntity>()
        .in(AdminRolePermissionEntity::getRoleId, roleIds)
    );
    List<String> permissionIds = links
      .stream()
      .map(AdminRolePermissionEntity::getPermissionId)
      .distinct()
      .toList();

    if (permissionIds.isEmpty()) {
      return List.of();
    }

    Set<String> permissionCodes = new LinkedHashSet<>();
    adminPermissionMapper.selectBatchIds(permissionIds)
      .stream()
      .map(AdminPermissionEntity::getCode)
      .sorted()
      .forEach(permissionCodes::add);
    return List.copyOf(permissionCodes);
  }

  private List<StoreDto> loadStores(String adminUserId, boolean hasAllStoreScope) {
    List<StoreEntity> stores;
    if (hasAllStoreScope) {
      stores = storeMapper.selectList(
        new LambdaQueryWrapper<StoreEntity>()
          .apply("\"status\" = 'ACTIVE'")
          .orderByAsc(StoreEntity::getType)
          .orderByAsc(StoreEntity::getCreatedAt)
      );
    } else {
      List<String> storeIds = adminUserStoreMapper.selectList(
          new LambdaQueryWrapper<AdminUserStoreEntity>()
            .eq(AdminUserStoreEntity::getAdminUserId, adminUserId)
        )
        .stream()
        .map(AdminUserStoreEntity::getStoreId)
        .distinct()
        .toList();

      if (storeIds.isEmpty()) {
        stores = List.of();
      } else {
        stores = storeMapper.selectList(
          new LambdaQueryWrapper<StoreEntity>()
            .in(StoreEntity::getId, storeIds)
            .apply("\"status\" = 'ACTIVE'")
            .orderByAsc(StoreEntity::getType)
            .orderByAsc(StoreEntity::getCreatedAt)
        );
      }
    }

    return stores.stream().map(this::toStoreDto).toList();
  }

  private StoreDto toStoreDto(StoreEntity store) {
    return new StoreDto(
      store.getId(),
      store.getCode(),
      store.getName(),
      store.getStatus(),
      store.getContactName(),
      store.getContactPhone(),
      store.getAddress(),
      store.getCutoffTime()
    );
  }

  private String sessionKey(String token) {
    return SESSION_KEY_PREFIX + token;
  }
}
