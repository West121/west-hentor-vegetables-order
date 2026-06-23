package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.MemberDetailResponse;
import cn.hentor.vegetables.dto.MemberImportResultDto;
import cn.hentor.vegetables.dto.MemberListItem;
import cn.hentor.vegetables.dto.MemberImportRow;
import cn.hentor.vegetables.dto.MemberUpdateRequest;
import cn.hentor.vegetables.dto.MemberUpdateResponse;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.MemberService;
import cn.hentor.vegetables.service.SpreadsheetImportService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/spring/admin/members")
public class MemberController {
  private final AdminAuthService adminAuthService;
  private final MemberService memberService;
  private final SpreadsheetImportService spreadsheetImportService;

  public MemberController(
    AdminAuthService adminAuthService,
    MemberService memberService,
    SpreadsheetImportService spreadsheetImportService
  ) {
    this.adminAuthService = adminAuthService;
    this.memberService = memberService;
    this.spreadsheetImportService = spreadsheetImportService;
  }

  @GetMapping
  public ApiResponse<PageResult<MemberListItem>> list(
    @RequestParam String storeId,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String query,
    @RequestParam(defaultValue = "1") long page,
    @RequestParam(defaultValue = "20") long pageSize,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(memberService.listMembers(storeId, status, query, page, pageSize));
  }

  @GetMapping("/{userId}")
  public ApiResponse<MemberDetailResponse> detail(
    @PathVariable String userId,
    @RequestParam String storeId,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.read");
    requireStoreAccess(session, storeId);
    return ApiResponse.ok(memberService.getMember(storeId, userId));
  }

  @PatchMapping("/{userId}")
  public ApiResponse<MemberUpdateResponse> update(
    @PathVariable String userId,
    @Valid @RequestBody MemberUpdateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.write");
    requireStoreAccess(session, request.storeId());
    return ApiResponse.ok(memberService.updateMember(request.storeId(), userId, request, session));
  }

  @PutMapping("/{userId}")
  public ApiResponse<MemberUpdateResponse> replace(
    @PathVariable String userId,
    @Valid @RequestBody MemberUpdateRequest request,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    return update(userId, request, authorization, tokenHeader, tokenCookie);
  }

  @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<MemberImportResultDto> importMembers(
    @RequestParam String storeId,
    @RequestParam MultipartFile file,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = requireSession(authorization, tokenHeader, tokenCookie);
    requirePermission(session, "members.write");
    requireStoreAccess(session, storeId);
    List<MemberImportRow> rows = spreadsheetImportService.parseMemberRows(file);
    if (rows.isEmpty()) {
      throw new ApiException("INVALID_PARAMS", "导入文件没有可识别的会员数据", HttpStatus.BAD_REQUEST);
    }
    return ApiResponse.ok(memberService.importMembers(storeId, rows, session));
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
