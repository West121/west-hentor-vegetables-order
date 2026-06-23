package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.DishImageUploadResponse;
import cn.hentor.vegetables.service.AdminAuthService;
import cn.hentor.vegetables.service.DishImageStorageService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/spring/admin/uploads/dish-images")
public class DishUploadController {
  private final AdminAuthService adminAuthService;
  private final DishImageStorageService dishImageStorageService;

  public DishUploadController(
    AdminAuthService adminAuthService,
    DishImageStorageService dishImageStorageService
  ) {
    this.adminAuthService = adminAuthService;
    this.dishImageStorageService = dishImageStorageService;
  }

  @PostMapping
  public ApiResponse<DishImageUploadResponse> upload(
    @RequestPart("file") MultipartFile file,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestHeader(value = "X-Admin-Token", required = false) String tokenHeader,
    @CookieValue(value = AdminAuthService.SESSION_COOKIE, required = false) String tokenCookie
  ) {
    AdminSessionDto session = adminAuthService.getSession(resolveToken(authorization, tokenHeader, tokenCookie));
    if (!session.permissionCodes().contains("dishes.write")) {
      throw new ApiException("FORBIDDEN", "没有操作权限", HttpStatus.FORBIDDEN);
    }
    return ApiResponse.ok(dishImageStorageService.upload(file));
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
