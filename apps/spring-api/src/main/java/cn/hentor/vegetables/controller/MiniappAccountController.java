package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.DishImageUploadResponse;
import cn.hentor.vegetables.dto.MiniAccountCancelRequest;
import cn.hentor.vegetables.dto.MiniAccountCancelResponse;
import cn.hentor.vegetables.dto.MiniAccountUpdateRequest;
import cn.hentor.vegetables.dto.MiniAccountUpdateResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.service.DishImageStorageService;
import cn.hentor.vegetables.service.MiniAccountService;
import cn.hentor.vegetables.service.MiniAuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({ "/api/spring/v1/account", "/api/v1/account" })
public class MiniappAccountController {
  private final DishImageStorageService dishImageStorageService;
  private final MiniAccountService miniAccountService;
  private final MiniAuthService miniAuthService;

  public MiniappAccountController(
    DishImageStorageService dishImageStorageService,
    MiniAccountService miniAccountService,
    MiniAuthService miniAuthService
  ) {
    this.dishImageStorageService = dishImageStorageService;
    this.miniAccountService = miniAccountService;
    this.miniAuthService = miniAuthService;
  }

  @PatchMapping
  public ApiResponse<MiniAccountUpdateResponse> updateProfile(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestBody MiniAccountUpdateRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniAccountService.updateProfile(session, request));
  }

  @PostMapping("/avatar")
  public ApiResponse<DishImageUploadResponse> uploadAvatar(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestParam("file") MultipartFile file
  ) {
    miniAuthService.requireSession(authorization);
    return ApiResponse.ok(dishImageStorageService.uploadAvatar(file));
  }

  @DeleteMapping
  public ApiResponse<MiniAccountCancelResponse> cancelAccount(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestBody(required = false) MiniAccountCancelRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(
      miniAccountService.cancelAccount(
        session,
        request == null ? new MiniAccountCancelRequest(null, null) : request
      )
    );
  }
}
