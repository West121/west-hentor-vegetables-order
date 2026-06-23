package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.service.StoreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/stores")
public class StoreController {
  private final StoreService storeService;

  public StoreController(StoreService storeService) {
    this.storeService = storeService;
  }

  @GetMapping("/current")
  public ResponseEntity<ApiResponse<StoreDto>> current(
    @RequestParam(defaultValue = "lotus-garden") String code
  ) {
    StoreDto store = storeService.getByCode(code);
    if (store == null) {
      return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.fail("STORE_NOT_FOUND", "门店不存在"));
    }

    return ResponseEntity.ok(ApiResponse.ok(store));
  }
}
