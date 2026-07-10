package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.AdminPermissionListResponse;
import cn.hentor.vegetables.dto.AdminRoleCreateRequest;
import cn.hentor.vegetables.dto.AdminRoleItemDto;
import cn.hentor.vegetables.dto.AdminRoleListResponse;
import cn.hentor.vegetables.dto.AdminRolePermissionDto;
import cn.hentor.vegetables.dto.AdminRoleResponse;
import cn.hentor.vegetables.dto.AdminRoleSummaryDto;
import cn.hentor.vegetables.dto.AdminRoleUpdateRequest;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.AdminUserCreateRequest;
import cn.hentor.vegetables.dto.AdminUserItemDto;
import cn.hentor.vegetables.dto.AdminUserListResponse;
import cn.hentor.vegetables.dto.AdminUserPasswordRequest;
import cn.hentor.vegetables.dto.AdminUserResponse;
import cn.hentor.vegetables.dto.AdminUserStatusCountRow;
import cn.hentor.vegetables.dto.AdminUserStoreDto;
import cn.hentor.vegetables.dto.AdminUserSummaryDto;
import cn.hentor.vegetables.dto.AdminUserUpdateRequest;
import cn.hentor.vegetables.dto.PaginationDto;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminPermissionEntity;
import cn.hentor.vegetables.entity.AdminRoleEntity;
import cn.hentor.vegetables.entity.AdminRolePermissionEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.AdminUserRoleEntity;
import cn.hentor.vegetables.entity.AdminUserStoreEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminPermissionMapper;
import cn.hentor.vegetables.mapper.AdminRoleMapper;
import cn.hentor.vegetables.mapper.AdminRolePermissionMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.AdminUserRoleMapper;
import cn.hentor.vegetables.mapper.AdminUserStoreMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class SystemManagementService {
  private static final Pattern ROLE_CODE_PATTERN = Pattern.compile("^[a-z][a-z0-9_.-]*$");
  private static final Set<String> ADMIN_STATUSES = Set.of("ACTIVE", "DISABLED");

  private final AdminAuthService adminAuthService;
  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminPermissionMapper adminPermissionMapper;
  private final AdminRoleMapper adminRoleMapper;
  private final AdminRolePermissionMapper adminRolePermissionMapper;
  private final AdminUserMapper adminUserMapper;
  private final AdminUserRoleMapper adminUserRoleMapper;
  private final AdminUserStoreMapper adminUserStoreMapper;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
  private final ObjectMapper objectMapper;
  private final StoreMapper storeMapper;

  public SystemManagementService(
    AdminAuthService adminAuthService,
    AdminOperationLogMapper adminOperationLogMapper,
    AdminPermissionMapper adminPermissionMapper,
    AdminRoleMapper adminRoleMapper,
    AdminRolePermissionMapper adminRolePermissionMapper,
    AdminUserMapper adminUserMapper,
    AdminUserRoleMapper adminUserRoleMapper,
    AdminUserStoreMapper adminUserStoreMapper,
    ObjectMapper objectMapper,
    StoreMapper storeMapper
  ) {
    this.adminAuthService = adminAuthService;
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminPermissionMapper = adminPermissionMapper;
    this.adminRoleMapper = adminRoleMapper;
    this.adminRolePermissionMapper = adminRolePermissionMapper;
    this.adminUserMapper = adminUserMapper;
    this.adminUserRoleMapper = adminUserRoleMapper;
    this.adminUserStoreMapper = adminUserStoreMapper;
    this.objectMapper = objectMapper;
    this.storeMapper = storeMapper;
  }

  public AdminUserListResponse listAdminUsers(
    AdminSessionDto session,
    String query,
    String status,
    String storeId,
    long page,
    long pageSize
  ) {
    String normalizedStatus = normalizeOptionalStatus(status);
    List<String> storeIds = resolveListStoreIds(session, storeId);
    if (storeIds != null && storeIds.isEmpty()) {
      return new AdminUserListResponse(
        List.of(),
        new PaginationDto(Math.max(page, 1), Math.min(Math.max(pageSize, 1), 100), 0, 0),
        new AdminUserSummaryDto(0, 0, 0)
      );
    }

    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    long offset = (normalizedPage - 1) * normalizedPageSize;
    String keyword = trimToNull(query);
    List<AdminUserEntity> users = adminUserMapper.selectAdminUsers(
      keyword,
      normalizedStatus,
      storeIds,
      normalizedPageSize,
      offset
    );
    long total = nullToZero(adminUserMapper.countAdminUsers(keyword, normalizedStatus, storeIds));
    AdminUserSummaryDto summary = buildUserSummary(
      adminUserMapper.countAdminUsersByStatus(null, null, storeIds)
    );
    return new AdminUserListResponse(
      buildUserItems(users),
      new PaginationDto(normalizedPage, normalizedPageSize, total, totalPages(total, normalizedPageSize)),
      summary
    );
  }

  public AdminUserResponse getAdminUser(AdminSessionDto session, String adminUserId) {
    AdminUserEntity user = requireAdminUser(adminUserId);
    ensureTargetUserAccessible(session, adminUserId);
    return new AdminUserResponse(buildUserItems(List.of(user)).getFirst());
  }

  @Transactional
  public AdminUserResponse createAdminUser(AdminSessionDto session, AdminUserCreateRequest request) {
    AdminUserInput input = normalizeAdminUserInput(
      request.username(),
      request.name(),
      request.phone(),
      request.status(),
      request.roleIds(),
      request.storeIds(),
      request.password()
    );
    ensureAssignmentAllowed(session, input.roleIds(), input.storeIds());
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    ensureRolesAndStores(input.roleIds(), input.storeIds());
    ensureUsernameAvailable(input.username(), null);

    LocalDateTime now = LocalDateTime.now();
    AdminUserEntity user = new AdminUserEntity();
    user.setId(id());
    user.setUsername(input.username());
    user.setName(input.name());
    user.setPhone(input.phone());
    user.setPasswordHash(passwordEncoder.encode(input.password()));
    user.setStatus(input.status());
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    adminUserMapper.insertAdminUser(user);
    replaceAdminUserRelations(user.getId(), input.roleIds(), input.storeIds());

    writeOperationLog(
      operator.getId(),
      firstOrNull(input.storeIds()),
      "admin_user",
      user.getId(),
      "ADMIN_USER_CREATED",
      null,
      adminUserLogValue(user.getUsername(), user.getName(), user.getPhone(), user.getStatus(), input.roleIds(), input.storeIds())
    );
    return getAdminUserById(user.getId());
  }

  @Transactional
  public AdminUserResponse updateAdminUser(
    AdminSessionDto session,
    String adminUserId,
    AdminUserUpdateRequest request
  ) {
    AdminUserEntity existing = requireAdminUser(adminUserId);
    ensureTargetUserAccessible(session, adminUserId);
    AdminUserInput input = normalizeAdminUserInput(
      existing.getUsername(),
      request.name(),
      request.phone(),
      request.status(),
      request.roleIds(),
      request.storeIds(),
      null
    );
    ensureAssignmentAllowed(session, input.roleIds(), input.storeIds());
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    ensureRolesAndStores(input.roleIds(), input.storeIds());
    AdminUserSnapshot before = snapshotAdminUser(existing);

    AdminUserEntity update = new AdminUserEntity();
    update.setId(adminUserId);
    update.setName(input.name());
    update.setPhone(input.phone());
    update.setStatus(input.status());
    update.setUpdatedAt(LocalDateTime.now());
    adminUserMapper.updateAdminUserProfile(update);
    replaceAdminUserRelations(adminUserId, input.roleIds(), input.storeIds());

    writeOperationLog(
      operator.getId(),
      firstOrNull(!input.storeIds().isEmpty() ? input.storeIds() : before.storeIds()),
      "admin_user",
      adminUserId,
      "ADMIN_USER_UPDATED",
      before.value(),
      adminUserLogValue(existing.getUsername(), input.name(), input.phone(), input.status(), input.roleIds(), input.storeIds())
    );
    return getAdminUserById(adminUserId);
  }

  @Transactional
  public AdminUserResponse resetAdminUserPassword(
    AdminSessionDto session,
    String adminUserId,
    AdminUserPasswordRequest request
  ) {
    String newPassword = normalizePassword(request.newPassword());
    AdminUserEntity existing = requireAdminUser(adminUserId);
    ensureTargetUserAccessible(session, adminUserId);
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    AdminUserSnapshot before = snapshotAdminUser(existing);

    AdminUserEntity update = new AdminUserEntity();
    update.setId(adminUserId);
    update.setPasswordHash(passwordEncoder.encode(newPassword));
    update.setUpdatedAt(LocalDateTime.now());
    adminUserMapper.updateAdminUserPassword(update);
    adminAuthService.invalidateAdminSessions(adminUserId, session.token());

    writeOperationLog(
      operator.getId(),
      firstOrNull(before.storeIds()),
      "admin_user",
      adminUserId,
      "ADMIN_USER_PASSWORD_RESET",
      null,
      Map.of("passwordResetAt", LocalDateTime.now().toString())
    );
    return getAdminUserById(adminUserId);
  }

  @Transactional
  public AdminUserListResponse deleteAdminUser(AdminSessionDto session, String adminUserId) {
    AdminUserEntity existing = requireAdminUser(adminUserId);
    ensureTargetUserAccessible(session, adminUserId);
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    ensureOperatorSuperAdmin(session);
    if (operator.getId().equals(adminUserId)) {
      throw new ApiException("ADMIN_USER_DELETE_SELF", "不能删除当前登录账号", HttpStatus.BAD_REQUEST);
    }
    AdminUserSnapshot before = snapshotAdminUser(existing);
    if (isSuperAdminRoleIds(before.value().get("roleIds"))) {
      throw new ApiException("ADMIN_USER_PROTECTED", "超级管理员账号不能删除", HttpStatus.BAD_REQUEST);
    }

    adminUserRoleMapper.delete(
      new LambdaQueryWrapper<AdminUserRoleEntity>().eq(AdminUserRoleEntity::getAdminUserId, adminUserId)
    );
    adminUserStoreMapper.delete(
      new LambdaQueryWrapper<AdminUserStoreEntity>().eq(AdminUserStoreEntity::getAdminUserId, adminUserId)
    );
    adminUserMapper.deleteById(adminUserId);
    adminAuthService.invalidateAdminSessions(adminUserId, null);

    writeOperationLog(
      operator.getId(),
      firstOrNull(before.storeIds()),
      "admin_user",
      adminUserId,
      "ADMIN_USER_DELETED",
      before.value(),
      Map.of("deleted", true)
    );
    return listAdminUsers(session, null, null, null, 1, 10);
  }

  public AdminRoleListResponse listAdminRoles(String query, long page, long pageSize) {
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    LambdaQueryWrapper<AdminRoleEntity> wrapper = new LambdaQueryWrapper<AdminRoleEntity>()
      .orderByDesc(AdminRoleEntity::getCreatedAt);
    String keyword = trimToNull(query);
    if (StringUtils.hasText(keyword)) {
      wrapper.and(w -> w
        .apply("\"code\" LIKE {0}", "%" + keyword + "%")
        .or()
        .apply("\"name\" LIKE {0}", "%" + keyword + "%"));
    }
    Page<AdminRoleEntity> result = adminRoleMapper.selectPage(
      new Page<>(normalizedPage, normalizedPageSize),
      wrapper
    );
    long total = result.getTotal();
    long summaryTotal = nullToZero(adminRoleMapper.selectCount(new LambdaQueryWrapper<>()));
    return new AdminRoleListResponse(
      buildRoleItems(result.getRecords()),
      new PaginationDto(normalizedPage, normalizedPageSize, total, totalPages(total, normalizedPageSize)),
      new AdminRoleSummaryDto(summaryTotal)
    );
  }

  public AdminPermissionListResponse listAdminPermissions() {
    List<AdminPermissionEntity> permissions = adminPermissionMapper.selectList(
      new LambdaQueryWrapper<AdminPermissionEntity>().orderByAsc(AdminPermissionEntity::getCode)
    );
    List<AdminRolePermissionDto> items = permissions.stream()
      .map(this::toPermissionDto)
      .toList();
    return new AdminPermissionListResponse(items, new AdminRoleSummaryDto(items.size()));
  }

  @Transactional
  public AdminRoleResponse createAdminRole(AdminSessionDto session, AdminRoleCreateRequest request) {
    String code = normalizeRoleCode(request.code());
    RoleInput input = normalizeRoleInput(request.name(), request.permissionIds());
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    ensurePermissions(input.permissionIds());
    AdminRoleEntity existing = adminRoleMapper.selectOne(
      new LambdaQueryWrapper<AdminRoleEntity>().eq(AdminRoleEntity::getCode, code)
    );
    if (existing != null) {
      throw new ApiException("ROLE_CODE_EXISTS", "角色编码已存在", HttpStatus.BAD_REQUEST);
    }

    LocalDateTime now = LocalDateTime.now();
    AdminRoleEntity role = new AdminRoleEntity();
    role.setId(id());
    role.setCode(code);
    role.setName(input.name());
    role.setCreatedAt(now);
    role.setUpdatedAt(now);
    adminRoleMapper.insert(role);
    replaceAdminRolePermissions(role.getId(), input.permissionIds());

    writeOperationLog(
      operator.getId(),
      null,
      "admin_role",
      role.getId(),
      "ADMIN_ROLE_CREATED",
      null,
      adminRoleLogValue(role.getCode(), role.getName(), input.permissionIds())
    );
    return new AdminRoleResponse(buildRoleItems(List.of(role)).getFirst());
  }

  @Transactional
  public AdminRoleResponse updateAdminRole(
    AdminSessionDto session,
    String roleId,
    AdminRoleUpdateRequest request
  ) {
    RoleInput input = normalizeRoleInput(request.name(), request.permissionIds());
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    ensurePermissions(input.permissionIds());
    AdminRoleEntity existing = requireAdminRole(roleId);
    Map<String, Object> before = adminRoleLogValue(
      existing.getCode(),
      existing.getName(),
      loadRolePermissionIds(roleId)
    );

    AdminRoleEntity update = new AdminRoleEntity();
    update.setId(roleId);
    update.setName(input.name());
    update.setUpdatedAt(LocalDateTime.now());
    adminRoleMapper.updateById(update);
    replaceAdminRolePermissions(roleId, input.permissionIds());

    writeOperationLog(
      operator.getId(),
      null,
      "admin_role",
      roleId,
      "ADMIN_ROLE_UPDATED",
      before,
      adminRoleLogValue(existing.getCode(), input.name(), input.permissionIds())
    );
    return new AdminRoleResponse(buildRoleItems(List.of(requireAdminRole(roleId))).getFirst());
  }

  @Transactional
  public void deleteAdminRole(AdminSessionDto session, String roleId) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    AdminRoleEntity existing = requireAdminRole(roleId);
    if ("super_admin".equals(existing.getCode())) {
      throw new ApiException("ROLE_PROTECTED", "超级管理员角色不能删除", HttpStatus.BAD_REQUEST);
    }

    long userCount = adminUserRoleMapper.selectCount(
      new LambdaQueryWrapper<AdminUserRoleEntity>().eq(AdminUserRoleEntity::getRoleId, roleId)
    );
    if (userCount > 0) {
      throw new ApiException("ROLE_IN_USE", "该角色已分配给后台用户，不能删除", HttpStatus.BAD_REQUEST);
    }

    Map<String, Object> before = adminRoleLogValue(
      existing.getCode(),
      existing.getName(),
      loadRolePermissionIds(roleId)
    );
    adminRolePermissionMapper.delete(
      new LambdaQueryWrapper<AdminRolePermissionEntity>().eq(AdminRolePermissionEntity::getRoleId, roleId)
    );
    adminRoleMapper.deleteById(roleId);

    writeOperationLog(
      operator.getId(),
      null,
      "admin_role",
      roleId,
      "ADMIN_ROLE_DELETED",
      before,
      Map.of("deleted", true)
    );
  }

  private List<AdminUserItemDto> buildUserItems(List<AdminUserEntity> users) {
    if (users.isEmpty()) {
      return List.of();
    }
    List<String> userIds = users.stream().map(AdminUserEntity::getId).toList();
    List<AdminUserRoleEntity> roleLinks = adminUserRoleMapper.selectList(
      new LambdaQueryWrapper<AdminUserRoleEntity>()
        .in(AdminUserRoleEntity::getAdminUserId, userIds)
        .orderByAsc(AdminUserRoleEntity::getRoleId)
    );
    List<AdminUserStoreEntity> storeLinks = adminUserStoreMapper.selectList(
      new LambdaQueryWrapper<AdminUserStoreEntity>()
        .in(AdminUserStoreEntity::getAdminUserId, userIds)
        .orderByAsc(AdminUserStoreEntity::getStoreId)
    );
    Map<String, AdminRoleEntity> roles = loadRolesByIds(
      roleLinks.stream().map(AdminUserRoleEntity::getRoleId).distinct().toList()
    );
    Map<String, StoreEntity> stores = loadStoresByIds(
      storeLinks.stream().map(AdminUserStoreEntity::getStoreId).distinct().toList()
    );
    Map<String, List<AdminUserRoleEntity>> roleLinksByUser = roleLinks.stream()
      .collect(Collectors.groupingBy(AdminUserRoleEntity::getAdminUserId));
    Map<String, List<AdminUserStoreEntity>> storeLinksByUser = storeLinks.stream()
      .collect(Collectors.groupingBy(AdminUserStoreEntity::getAdminUserId));

    return users.stream()
      .map(user -> {
        List<AdminRoleEntity> userRoles = roleLinksByUser.getOrDefault(user.getId(), List.of())
          .stream()
          .map(link -> roles.get(link.getRoleId()))
          .filter(java.util.Objects::nonNull)
          .toList();
        List<StoreEntity> userStores = storeLinksByUser.getOrDefault(user.getId(), List.of())
          .stream()
          .map(link -> stores.get(link.getStoreId()))
          .filter(java.util.Objects::nonNull)
          .toList();
        return new AdminUserItemDto(
          user.getCreatedAt(),
          user.getId(),
          user.getLastLoginAt(),
          user.getName(),
          user.getPhone(),
          userRoles.stream().map(AdminRoleEntity::getId).toList(),
          userRoles.stream().map(AdminRoleEntity::getName).toList(),
          user.getStatus(),
          userStores.stream().map(StoreEntity::getId).toList(),
          userStores.stream().map(StoreEntity::getName).toList(),
          userStores.stream().map(this::toAdminUserStoreDto).toList(),
          user.getUpdatedAt(),
          user.getUsername()
        );
      })
      .toList();
  }

  private List<AdminRoleItemDto> buildRoleItems(List<AdminRoleEntity> roles) {
    if (roles.isEmpty()) {
      return List.of();
    }
    List<String> roleIds = roles.stream().map(AdminRoleEntity::getId).toList();
    List<AdminRolePermissionEntity> permissionLinks = adminRolePermissionMapper.selectList(
      new LambdaQueryWrapper<AdminRolePermissionEntity>()
        .in(AdminRolePermissionEntity::getRoleId, roleIds)
        .orderByAsc(AdminRolePermissionEntity::getPermissionId)
    );
    Map<String, AdminPermissionEntity> permissions = loadPermissionsByIds(
      permissionLinks.stream().map(AdminRolePermissionEntity::getPermissionId).distinct().toList()
    );
    Map<String, List<AdminRolePermissionEntity>> permissionsByRole = permissionLinks.stream()
      .collect(Collectors.groupingBy(AdminRolePermissionEntity::getRoleId));
    Map<String, Long> userCounts = adminUserRoleMapper.selectList(
        new LambdaQueryWrapper<AdminUserRoleEntity>().in(AdminUserRoleEntity::getRoleId, roleIds)
      )
      .stream()
      .collect(Collectors.groupingBy(AdminUserRoleEntity::getRoleId, Collectors.counting()));

    return roles.stream()
      .map(role -> {
        List<AdminRolePermissionDto> rolePermissions = permissionsByRole
          .getOrDefault(role.getId(), List.of())
          .stream()
          .map(link -> permissions.get(link.getPermissionId()))
          .filter(java.util.Objects::nonNull)
          .map(this::toPermissionDto)
          .sorted(Comparator.comparing(AdminRolePermissionDto::code))
          .toList();
        return new AdminRoleItemDto(
          role.getCode(),
          role.getCreatedAt(),
          role.getId(),
          role.getName(),
          rolePermissions.stream().map(AdminRolePermissionDto::code).toList(),
          rolePermissions,
          role.getUpdatedAt(),
          userCounts.getOrDefault(role.getId(), 0L)
        );
      })
      .toList();
  }

  private AdminUserResponse getAdminUserById(String adminUserId) {
    return new AdminUserResponse(buildUserItems(List.of(requireAdminUser(adminUserId))).getFirst());
  }

  private AdminUserSummaryDto buildUserSummary(List<AdminUserStatusCountRow> rows) {
    long active = 0;
    long disabled = 0;
    for (AdminUserStatusCountRow row : rows) {
      long count = nullToZero(row.getCount());
      if ("ACTIVE".equals(row.getStatus())) {
        active = count;
      } else if ("DISABLED".equals(row.getStatus())) {
        disabled = count;
      }
    }
    return new AdminUserSummaryDto(active, disabled, active + disabled);
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private AdminUserEntity requireAdminUser(String adminUserId) {
    AdminUserEntity user = adminUserMapper.selectById(adminUserId);
    if (user == null) {
      throw new ApiException("ADMIN_USER_NOT_FOUND", "后台用户不存在", HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private AdminRoleEntity requireAdminRole(String roleId) {
    AdminRoleEntity role = adminRoleMapper.selectById(roleId);
    if (role == null) {
      throw new ApiException("ROLE_NOT_FOUND", "后台角色不存在", HttpStatus.NOT_FOUND);
    }
    return role;
  }

  private void ensureTargetUserAccessible(AdminSessionDto session, String adminUserId) {
    if ("ALL".equals(session.storeScope())) {
      return;
    }
    Set<String> allowedStoreIds = session.stores().stream().map(StoreDto::id).collect(Collectors.toSet());
    if (allowedStoreIds.isEmpty()) {
      throw new ApiException("ADMIN_USER_NOT_FOUND", "后台用户不存在", HttpStatus.NOT_FOUND);
    }
    boolean hasAccessibleStore = adminUserStoreMapper.selectCount(
      new LambdaQueryWrapper<AdminUserStoreEntity>()
        .eq(AdminUserStoreEntity::getAdminUserId, adminUserId)
        .in(AdminUserStoreEntity::getStoreId, allowedStoreIds)
    ) > 0;
    if (!hasAccessibleStore) {
      throw new ApiException("ADMIN_USER_NOT_FOUND", "后台用户不存在", HttpStatus.NOT_FOUND);
    }
  }

  private void ensureAssignmentAllowed(
    AdminSessionDto session,
    List<String> roleIds,
    List<String> storeIds
  ) {
    if ("ALL".equals(session.storeScope())) {
      return;
    }
    if (storeIds.isEmpty()) {
      throw new ApiException("STORE_FORBIDDEN", "无权分配全部数据账号", HttpStatus.FORBIDDEN);
    }
    Set<String> allowedStoreIds = session.stores().stream().map(StoreDto::id).collect(Collectors.toSet());
    boolean hasForbiddenStore = storeIds.stream().anyMatch(storeId -> !allowedStoreIds.contains(storeId));
    if (hasForbiddenStore) {
      throw new ApiException("STORE_FORBIDDEN", "无权分配该数据范围", HttpStatus.FORBIDDEN);
    }
    List<AdminRoleEntity> roles = adminRoleMapper.selectBatchIds(roleIds);
    if (roles.stream().anyMatch(role -> "super_admin".equals(role.getCode()))) {
      throw new ApiException("ROLE_FORBIDDEN", "无权分配超级管理员角色", HttpStatus.FORBIDDEN);
    }
  }

  private void ensureOperatorSuperAdmin(AdminSessionDto session) {
    if (session.roles().stream().noneMatch(role -> "super_admin".equals(role.code()))) {
      throw new ApiException("FORBIDDEN", "只有超级管理员可以删除后台用户", HttpStatus.FORBIDDEN);
    }
  }

  private boolean isSuperAdminRoleIds(Object roleIdsValue) {
    if (!(roleIdsValue instanceof List<?> roleIds) || roleIds.isEmpty()) {
      return false;
    }
    List<String> roleIdStrings = roleIds.stream()
      .filter(String.class::isInstance)
      .map(String.class::cast)
      .toList();
    if (roleIdStrings.isEmpty()) {
      return false;
    }
    return adminRoleMapper.selectBatchIds(roleIdStrings)
      .stream()
      .anyMatch(role -> "super_admin".equals(role.getCode()));
  }

  private List<String> resolveListStoreIds(AdminSessionDto session, String storeId) {
    if (StringUtils.hasText(storeId)) {
      String normalizedStoreId = storeId.trim();
      if (!"ALL".equals(session.storeScope()) && session.stores().stream().noneMatch(store -> normalizedStoreId.equals(store.id()))) {
        throw new ApiException("STORE_FORBIDDEN", "没有该门店权限", HttpStatus.FORBIDDEN);
      }
      return List.of(normalizedStoreId);
    }
    if ("ALL".equals(session.storeScope())) {
      return null;
    }
    return session.stores().stream().map(StoreDto::id).toList();
  }

  private void ensureUsernameAvailable(String username, String ignoreAdminUserId) {
    AdminUserEntity existing = adminUserMapper.selectOne(
      new LambdaQueryWrapper<AdminUserEntity>().eq(AdminUserEntity::getUsername, username)
    );
    if (existing != null && !existing.getId().equals(ignoreAdminUserId)) {
      throw new ApiException("USERNAME_EXISTS", "登录账号已存在", HttpStatus.BAD_REQUEST);
    }
  }

  private void ensureRolesAndStores(List<String> roleIds, List<String> storeIds) {
    if (roleIds.isEmpty()) {
      throw new ApiException("ROLE_IDS_INVALID", "请选择不重复的后台角色", HttpStatus.BAD_REQUEST);
    }
    long roleCount = adminRoleMapper.selectCount(
      new LambdaQueryWrapper<AdminRoleEntity>().in(AdminRoleEntity::getId, roleIds)
    );
    if (roleCount != roleIds.size()) {
      throw new ApiException("ROLE_NOT_FOUND", "后台角色不存在", HttpStatus.NOT_FOUND);
    }
    if (!storeIds.isEmpty()) {
      long storeCount = storeMapper.selectCount(
        new LambdaQueryWrapper<StoreEntity>()
          .in(StoreEntity::getId, storeIds)
          .apply("\"status\" = 'ACTIVE'")
      );
      if (storeCount != storeIds.size()) {
        throw new ApiException("STORE_NOT_FOUND", "授权门店不存在或已停用", HttpStatus.NOT_FOUND);
      }
    }
  }

  private void ensurePermissions(List<String> permissionIds) {
    long permissionCount = adminPermissionMapper.selectCount(
      new LambdaQueryWrapper<AdminPermissionEntity>().in(AdminPermissionEntity::getId, permissionIds)
    );
    if (permissionCount != permissionIds.size()) {
      throw new ApiException("PERMISSION_NOT_FOUND", "角色权限不存在", HttpStatus.NOT_FOUND);
    }
  }

  private void replaceAdminUserRelations(String adminUserId, List<String> roleIds, List<String> storeIds) {
    adminUserRoleMapper.delete(
      new LambdaQueryWrapper<AdminUserRoleEntity>().eq(AdminUserRoleEntity::getAdminUserId, adminUserId)
    );
    adminUserStoreMapper.delete(
      new LambdaQueryWrapper<AdminUserStoreEntity>().eq(AdminUserStoreEntity::getAdminUserId, adminUserId)
    );
    for (String roleId : roleIds) {
      AdminUserRoleEntity link = new AdminUserRoleEntity();
      link.setAdminUserId(adminUserId);
      link.setRoleId(roleId);
      adminUserRoleMapper.insert(link);
    }
    for (String storeId : storeIds) {
      AdminUserStoreEntity link = new AdminUserStoreEntity();
      link.setAdminUserId(adminUserId);
      link.setStoreId(storeId);
      adminUserStoreMapper.insert(link);
    }
  }

  private void replaceAdminRolePermissions(String roleId, List<String> permissionIds) {
    adminRolePermissionMapper.delete(
      new LambdaQueryWrapper<AdminRolePermissionEntity>().eq(AdminRolePermissionEntity::getRoleId, roleId)
    );
    for (String permissionId : permissionIds) {
      AdminRolePermissionEntity link = new AdminRolePermissionEntity();
      link.setRoleId(roleId);
      link.setPermissionId(permissionId);
      adminRolePermissionMapper.insert(link);
    }
  }

  private AdminUserSnapshot snapshotAdminUser(AdminUserEntity user) {
    List<String> roleIds = adminUserRoleMapper.selectList(
        new LambdaQueryWrapper<AdminUserRoleEntity>()
          .eq(AdminUserRoleEntity::getAdminUserId, user.getId())
          .orderByAsc(AdminUserRoleEntity::getRoleId)
      )
      .stream()
      .map(AdminUserRoleEntity::getRoleId)
      .toList();
    List<String> storeIds = adminUserStoreMapper.selectList(
        new LambdaQueryWrapper<AdminUserStoreEntity>()
          .eq(AdminUserStoreEntity::getAdminUserId, user.getId())
          .orderByAsc(AdminUserStoreEntity::getStoreId)
      )
      .stream()
      .map(AdminUserStoreEntity::getStoreId)
      .toList();
    return new AdminUserSnapshot(
      storeIds,
      adminUserLogValue(user.getUsername(), user.getName(), user.getPhone(), user.getStatus(), roleIds, storeIds)
    );
  }

  private List<String> loadRolePermissionIds(String roleId) {
    return adminRolePermissionMapper.selectList(
        new LambdaQueryWrapper<AdminRolePermissionEntity>()
          .eq(AdminRolePermissionEntity::getRoleId, roleId)
          .orderByAsc(AdminRolePermissionEntity::getPermissionId)
      )
      .stream()
      .map(AdminRolePermissionEntity::getPermissionId)
      .toList();
  }

  private Map<String, AdminRoleEntity> loadRolesByIds(List<String> roleIds) {
    if (roleIds.isEmpty()) {
      return Map.of();
    }
    return adminRoleMapper.selectBatchIds(roleIds)
      .stream()
      .collect(Collectors.toMap(AdminRoleEntity::getId, Function.identity()));
  }

  private Map<String, StoreEntity> loadStoresByIds(List<String> storeIds) {
    if (storeIds.isEmpty()) {
      return Map.of();
    }
    return storeMapper.selectBatchIds(storeIds)
      .stream()
      .collect(Collectors.toMap(StoreEntity::getId, Function.identity()));
  }

  private Map<String, AdminPermissionEntity> loadPermissionsByIds(List<String> permissionIds) {
    if (permissionIds.isEmpty()) {
      return Map.of();
    }
    return adminPermissionMapper.selectBatchIds(permissionIds)
      .stream()
      .collect(Collectors.toMap(AdminPermissionEntity::getId, Function.identity()));
  }

  private AdminUserInput normalizeAdminUserInput(
    String username,
    String name,
    String phone,
    String status,
    List<String> roleIds,
    List<String> storeIds,
    String password
  ) {
    String normalizedUsername = AdminUsernamePolicy.normalizeForCreate(username);
    String normalizedName = trimToNull(name);
    if (!StringUtils.hasText(normalizedName)) {
      throw new ApiException("NAME_REQUIRED", "请输入用户姓名", HttpStatus.BAD_REQUEST);
    }
    String normalizedStatus = normalizeRequiredStatus(status);
    List<String> normalizedRoleIds = normalizeIdList(roleIds, "ROLE_IDS_INVALID", "请选择不重复的后台角色", true);
    List<String> normalizedStoreIds = normalizeIdList(storeIds, "STORE_IDS_INVALID", "请选择不重复的授权门店", false);
    String normalizedPassword = password == null ? null : normalizePassword(password);
    return new AdminUserInput(
      normalizedUsername,
      normalizedName,
      normalizeNullableText(phone),
      normalizedStatus,
      normalizedRoleIds,
      normalizedStoreIds,
      normalizedPassword
    );
  }

  private RoleInput normalizeRoleInput(String name, List<String> permissionIds) {
    String normalizedName = trimToNull(name);
    if (!StringUtils.hasText(normalizedName)) {
      throw new ApiException("ROLE_NAME_REQUIRED", "请输入角色名称", HttpStatus.BAD_REQUEST);
    }
    return new RoleInput(
      normalizedName,
      normalizeIdList(permissionIds, "PERMISSION_IDS_INVALID", "请选择不重复的角色权限", true)
    );
  }

  private List<String> normalizeIdList(
    List<String> values,
    String code,
    String message,
    boolean requireNonEmpty
  ) {
    if (values == null) {
      throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
    }
    List<String> normalized = new ArrayList<>();
    for (String value : values) {
      String trimmed = trimToNull(value);
      if (!StringUtils.hasText(trimmed)) {
        throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
      }
      normalized.add(trimmed);
    }
    List<String> distinct = new ArrayList<>(new LinkedHashSet<>(normalized));
    if (distinct.size() != normalized.size() || (requireNonEmpty && distinct.isEmpty())) {
      throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
    }
    return distinct;
  }

  private String normalizePassword(String password) {
    if (password == null || password.trim().length() < 8) {
      throw new ApiException("PASSWORD_INVALID", "密码至少需要 8 位", HttpStatus.BAD_REQUEST);
    }
    return password;
  }

  private String normalizeRequiredStatus(String status) {
    String normalized = trimToNull(status);
    if (!ADMIN_STATUSES.contains(normalized)) {
      throw new ApiException("STATUS_INVALID", "后台用户状态不正确", HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private String normalizeOptionalStatus(String status) {
    if (!StringUtils.hasText(status) || "ALL".equalsIgnoreCase(status.trim())) {
      return null;
    }
    return normalizeRequiredStatus(status);
  }

  private String normalizeRoleCode(String code) {
    String normalized = trimToNull(code);
    if (!StringUtils.hasText(normalized) || !ROLE_CODE_PATTERN.matcher(normalized).matches()) {
      throw new ApiException(
        "ROLE_CODE_INVALID",
        "角色编码只能使用小写字母、数字、点、下划线和短横线，且需以字母开头",
        HttpStatus.BAD_REQUEST
      );
    }
    return normalized;
  }

  private String normalizeNullableText(String value) {
    return trimToNull(value);
  }

  private String trimToNull(String value) {
    String trimmed = value == null ? "" : value.trim();
    return StringUtils.hasText(trimmed) ? trimmed : null;
  }

  private Map<String, Object> adminUserLogValue(
    String username,
    String name,
    String phone,
    String status,
    List<String> roleIds,
    List<String> storeIds
  ) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("name", name);
    value.put("phone", phone);
    value.put("roleIds", roleIds);
    value.put("status", status);
    value.put("storeIds", storeIds);
    value.put("username", username);
    return value;
  }

  private Map<String, Object> adminRoleLogValue(
    String code,
    String name,
    List<String> permissionIds
  ) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("code", code);
    value.put("name", name);
    value.put("permissionIds", permissionIds);
    return value;
  }

  private AdminUserStoreDto toAdminUserStoreDto(StoreEntity store) {
    return new AdminUserStoreDto(store.getCode(), store.getId(), store.getName(), store.getType());
  }

  private AdminRolePermissionDto toPermissionDto(AdminPermissionEntity permission) {
    return new AdminRolePermissionDto(
      permission.getCode(),
      permission.getCreatedAt(),
      permission.getId(),
      permission.getName()
    );
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String resource,
    String resourceId,
    String action,
    Object beforeValue,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource(resource);
    log.setResourceId(resourceId);
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

  private String firstOrNull(List<String> values) {
    return values.isEmpty() ? null : values.getFirst();
  }

  private long nullToZero(Long value) {
    return value == null ? 0 : value;
  }

  private long totalPages(long total, long pageSize) {
    return pageSize <= 0 ? 0 : (long) Math.ceil((double) total / pageSize);
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private record AdminUserInput(
    String username,
    String name,
    String phone,
    String status,
    List<String> roleIds,
    List<String> storeIds,
    String password
  ) {}

  private record RoleInput(String name, List<String> permissionIds) {}

  private record AdminUserSnapshot(List<String> storeIds, Map<String, Object> value) {}
}
