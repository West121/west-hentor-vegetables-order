package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.dto.MiniStoreListData;
import cn.hentor.vegetables.dto.MiniStorePublicSettingsDto;
import cn.hentor.vegetables.dto.MiniStoreSwitchRequest;
import cn.hentor.vegetables.dto.MiniStoreSwitchResponse;
import cn.hentor.vegetables.service.MiniAuthService;
import cn.hentor.vegetables.service.MiniStoreService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/v1/stores")
public class MiniappStoreController {
  private final MiniAuthService miniAuthService;
  private final MiniStoreService miniStoreService;

  public MiniappStoreController(MiniAuthService miniAuthService, MiniStoreService miniStoreService) {
    this.miniAuthService = miniAuthService;
    this.miniStoreService = miniStoreService;
  }

  @GetMapping("/current")
  public ApiResponse<MiniStoreListData> current(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    MiniStoreListData stores = miniStoreService.listMemberStores(session);
    if (stores.currentStore() == null) {
      throw new ApiException("STORE_NOT_FOUND", "当前门店不可用", HttpStatus.NOT_FOUND);
    }
    return ApiResponse.ok(stores);
  }

  @GetMapping("/settings")
  public ApiResponse<MiniStorePublicSettingsDto> settings(
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    return ApiResponse.ok(miniStoreService.getPublicSettings(storeCode));
  }

  @PostMapping("/switch")
  public ApiResponse<MiniStoreSwitchResponse> switchStore(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @Valid @RequestBody MiniStoreSwitchRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniStoreService.switchStore(session, request));
  }
}
