package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.MiniAddressDeleteResponse;
import cn.hentor.vegetables.dto.MiniAddressListData;
import cn.hentor.vegetables.dto.MiniAddressRequest;
import cn.hentor.vegetables.dto.MiniAddressResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.service.MiniAddressService;
import cn.hentor.vegetables.service.MiniAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/spring/v1/addresses")
public class MiniappAddressController {
  private final MiniAddressService miniAddressService;
  private final MiniAuthService miniAuthService;

  public MiniappAddressController(MiniAddressService miniAddressService, MiniAuthService miniAuthService) {
    this.miniAddressService = miniAddressService;
    this.miniAuthService = miniAuthService;
  }

  @GetMapping
  public ApiResponse<MiniAddressListData> list(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniAddressService.list(session, storeCode));
  }

  @PostMapping
  public ApiResponse<MiniAddressResponse> create(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @Valid @RequestBody MiniAddressRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniAddressService.create(session, request));
  }

  @PatchMapping("/{addressId}")
  public ApiResponse<MiniAddressResponse> update(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String addressId,
    @Valid @RequestBody MiniAddressRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniAddressService.update(session, addressId, request));
  }

  @PutMapping("/{addressId}")
  public ApiResponse<MiniAddressResponse> replace(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String addressId,
    @Valid @RequestBody MiniAddressRequest request
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniAddressService.update(session, addressId, request));
  }

  @PostMapping("/{addressId}/default")
  public ApiResponse<MiniAddressResponse> setDefault(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String addressId,
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniAddressService.setDefault(session, addressId, storeCode));
  }

  @DeleteMapping("/{addressId}")
  public ApiResponse<MiniAddressDeleteResponse> delete(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
    @PathVariable String addressId,
    @RequestParam(defaultValue = "lotus-garden") String storeCode
  ) {
    MiniSessionContext session = miniAuthService.requireSession(authorization);
    return ApiResponse.ok(miniAddressService.delete(session, addressId, storeCode));
  }
}
