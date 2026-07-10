package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniHomeData;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.service.MiniAuthService;
import cn.hentor.vegetables.service.MiniHomeService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/v1/home")
public class MiniappHomeController {
  private final MiniAuthService miniAuthService;
  private final MiniHomeService miniHomeService;

  public MiniappHomeController(MiniAuthService miniAuthService, MiniHomeService miniHomeService) {
    this.miniAuthService = miniAuthService;
    this.miniHomeService = miniHomeService;
  }

  @GetMapping
  public ApiResponse<MiniHomeData> home(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestParam(defaultValue = "lotus-garden") String storeCode,
    @RequestParam(required = false) String orderId
  ) {
    MiniSessionContext session = miniAuthService.resolveSessionOrNull(authorization);
    return ApiResponse.ok(miniHomeService.getHome(session, storeCode, orderId));
  }
}
