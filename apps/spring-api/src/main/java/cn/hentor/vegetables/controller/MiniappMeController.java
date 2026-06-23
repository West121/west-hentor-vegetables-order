package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniProfileData;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.service.MiniAuthService;
import cn.hentor.vegetables.service.MiniProfileService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/v1/me")
public class MiniappMeController {
  private final MiniAuthService miniAuthService;
  private final MiniProfileService miniProfileService;

  public MiniappMeController(MiniAuthService miniAuthService, MiniProfileService miniProfileService) {
    this.miniAuthService = miniAuthService;
    this.miniProfileService = miniProfileService;
  }

  @GetMapping
  public ApiResponse<MiniProfileData> me(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniProfileService.getProfile(session, storeCode));
  }
}
