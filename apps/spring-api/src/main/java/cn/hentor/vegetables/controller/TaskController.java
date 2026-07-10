package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.dto.TaskCancelRequest;
import cn.hentor.vegetables.dto.TaskCopyRequest;
import cn.hentor.vegetables.dto.TaskListResponse;
import cn.hentor.vegetables.dto.TaskRequest;
import cn.hentor.vegetables.dto.TaskResponse;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.TaskQueryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/admin/tasks")
public class TaskController {
  private final AdminAuthService adminAuthService;
  private final TaskQueryService taskQueryService;

  public TaskController(AdminAuthService adminAuthService, TaskQueryService taskQueryService) {
    this.adminAuthService = adminAuthService;
    this.taskQueryService = taskQueryService;
  }

  @GetMapping
  public ApiResponse<TaskListResponse> list(
    @RequestParam String storeId,
    @RequestParam(required = false) String query,
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "10") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "tasks.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(taskQueryService.list(storeId, status, query, page, pageSize));
  }

  @PostMapping
  public ApiResponse<TaskResponse> create(
    @Valid @RequestBody TaskRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "tasks.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(taskQueryService.create(request, session));
  }

  @GetMapping("/{taskId}")
  public ApiResponse<TaskResponse> get(
    @PathVariable String taskId,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "tasks.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(taskQueryService.get(storeId, taskId));
  }

  @PatchMapping("/{taskId}")
  public ApiResponse<TaskResponse> update(
    @PathVariable String taskId,
    @Valid @RequestBody TaskRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "tasks.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(taskQueryService.update(taskId, request, session));
  }

  @PutMapping("/{taskId}")
  public ApiResponse<TaskResponse> put(
    @PathVariable String taskId,
    @Valid @RequestBody TaskRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return update(taskId, request, authorization, tokenHeader, tokenCookie);
  }

  @PostMapping("/{taskId}/copy")
  public ApiResponse<TaskResponse> copy(
    @PathVariable String taskId,
    @Valid @RequestBody TaskCopyRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "tasks.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(taskQueryService.copy(taskId, request, session));
  }

  @PostMapping("/{taskId}/cancel")
  public ApiResponse<TaskResponse> cancel(
    @PathVariable String taskId,
    @Valid @RequestBody TaskCancelRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "tasks.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(taskQueryService.cancel(taskId, request.storeId(), session));
  }

  private AdminSessionDto requireSession(String authorization, String tokenHeader, String tokenCookie) {
    return adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie));
  }

  private void requirePermission(AdminSessionDto session, String permission) {
    if (!session.permissionCodes().contains(permission)) {
      throw new ApiException("FORBIDDEN", "没有操作权限", HttpStatus.FORBIDDEN);
    }
  }

  private void requireStoreAccess(AdminSessionDto session, String storeId) {
    if ("ALL".equals(session.storeScope())) {
      return;
    }
    boolean allowed = session.stores().stream().map(StoreDto::id).anyMatch(storeId::equals);
    if (!allowed) {
      throw new ApiException("STORE_FORBIDDEN", "没有该门店权限", HttpStatus.FORBIDDEN);
    }
  }

  private String resolveToken(String authorization, String tokenHeader, String tokenCookie) {
    if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
      return authorization.substring("Bearer ".length()).trim();
    }
    if (StringUtils.hasText(tokenHeader)) {
      return tokenHeader.trim();
    }
    return tokenCookie;
  }
}
