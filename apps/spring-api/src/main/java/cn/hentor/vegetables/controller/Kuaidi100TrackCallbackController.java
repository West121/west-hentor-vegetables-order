package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.service.OrderShipmentTrackingService;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Kuaidi100TrackCallbackController {
  private final OrderShipmentTrackingService orderShipmentTrackingService;

  public Kuaidi100TrackCallbackController(OrderShipmentTrackingService orderShipmentTrackingService) {
    this.orderShipmentTrackingService = orderShipmentTrackingService;
  }

  @PostMapping(
    value = "/api/spring/kuaidi100/track/callback",
    consumes = {
      MediaType.APPLICATION_FORM_URLENCODED_VALUE,
      MediaType.APPLICATION_JSON_VALUE,
      MediaType.ALL_VALUE
    }
  )
  public Map<String, Object> callback(
    @RequestParam(value = "param", required = false) String param,
    @RequestBody(required = false) String body
  ) {
    return orderShipmentTrackingService.handleCallback(StringUtils.hasText(param) ? param : body);
  }
}
