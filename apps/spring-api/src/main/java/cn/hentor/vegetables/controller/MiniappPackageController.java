package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniPackagesData;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.service.MiniAuthService;
import cn.hentor.vegetables.service.MiniPackageService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/v1/packages")
public class MiniappPackageController {
  private final MiniAuthService miniAuthService;
  private final MiniPackageService miniPackageService;

  public MiniappPackageController(MiniAuthService miniAuthService, MiniPackageService miniPackageService) {
    this.miniAuthService = miniAuthService;
    this.miniPackageService = miniPackageService;
  }

  @GetMapping
  public ApiResponse<MiniPackagesData> packages(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniPackageService.listPackages(session, storeCode));
  }
}
