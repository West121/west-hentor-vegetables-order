package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.Kuaidi100Properties;
import cn.hentor.vegetables.dto.Kuaidi100PrintConfig;
import cn.hentor.vegetables.dto.OrderShipmentTrackDto;
import cn.hentor.vegetables.dto.OrderShipmentTrackEventDto;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderShipmentEntity;
import cn.hentor.vegetables.entity.OrderShipmentTrackEntity;
import cn.hentor.vegetables.entity.OrderShipmentTrackEventEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.OrderShipmentMapper;
import cn.hentor.vegetables.mapper.OrderShipmentTrackEventMapper;
import cn.hentor.vegetables.mapper.OrderShipmentTrackMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class OrderShipmentTrackingService {
  private static final DateTimeFormatter TRACK_TIME_FORMAT =
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final HttpClient httpClient = HttpClient
    .newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .build();
  private final ObjectMapper objectMapper;
  private final OrderMapper orderMapper;
  private final OrderShipmentMapper orderShipmentMapper;
  private final OrderShipmentTrackMapper trackMapper;
  private final OrderShipmentTrackEventMapper eventMapper;
  private final Kuaidi100Properties properties;
  private final Kuaidi100PrinterService printerService;
  private final StoreMapper storeMapper;

  public OrderShipmentTrackingService(
    ObjectMapper objectMapper,
    OrderMapper orderMapper,
    OrderShipmentMapper orderShipmentMapper,
    OrderShipmentTrackMapper trackMapper,
    OrderShipmentTrackEventMapper eventMapper,
    Kuaidi100Properties properties,
    Kuaidi100PrinterService printerService,
    StoreMapper storeMapper
  ) {
    this.objectMapper = objectMapper;
    this.orderMapper = orderMapper;
    this.orderShipmentMapper = orderShipmentMapper;
    this.trackMapper = trackMapper;
    this.eventMapper = eventMapper;
    this.properties = properties;
    this.printerService = printerService;
    this.storeMapper = storeMapper;
  }

  public void subscribeQuietly(OrderEntity order, OrderShipmentEntity shipment, String receiverPhone) {
    try {
      subscribe(order, shipment, receiverPhone);
    } catch (RuntimeException ignored) {
      // 轨迹订阅不能影响发货/电子面单主流程，失败状态会在轨迹记录里保留。
    }
  }

  @Transactional
  public OrderShipmentTrackDto refresh(String storeId, String orderId, String shipmentId) {
    OrderEntity order = orderMapper.selectById(orderId);
    if (order == null || !StringUtils.hasText(order.getStoreId()) || !order.getStoreId().equals(storeId)) {
      throw new ApiException("ORDER_NOT_FOUND", "订单不存在", HttpStatus.NOT_FOUND);
    }
    OrderShipmentEntity shipment = orderShipmentMapper.selectById(shipmentId);
    if (shipment == null || !orderId.equals(shipment.getOrderId())) {
      throw new ApiException("SHIPMENT_NOT_FOUND", "包裹不存在", HttpStatus.NOT_FOUND);
    }
    if (!StringUtils.hasText(shipment.getLogisticsNo())) {
      throw new ApiException("SHIPMENT_NO_REQUIRED", "该包裹还没有物流单号", HttpStatus.BAD_REQUEST);
    }

    QueryResult result = queryTrack(shipment, receiverPhone(order));
    OrderShipmentTrackEntity track = persistResult(order, shipment, result, "QUERY_SYNCED");
    syncMapTrackQuietly(order, shipment, track, receiverPhone(order));
    return toDto(track);
  }

  @Transactional
  public Map<String, Object> handleCallback(String rawParam) {
    if (!StringUtils.hasText(rawParam)) {
      return callbackResponse(false, "回调参数为空");
    }
    try {
      JsonNode payload = objectMapper.readTree(rawParam);
      JsonNode resultNode = payload.has("lastResult") ? payload.path("lastResult") : payload;
      String logisticsNo = firstText(
        resultNode.path("nu").asText(null),
        resultNode.path("number").asText(null),
        payload.path("number").asText(null)
      );
      if (!StringUtils.hasText(logisticsNo)) {
        return callbackResponse(false, "未找到物流单号");
      }

      OrderShipmentEntity shipment = orderShipmentMapper.selectOne(
        new LambdaQueryWrapper<OrderShipmentEntity>()
          .eq(OrderShipmentEntity::getLogisticsNo, logisticsNo.trim())
          .orderByDesc(OrderShipmentEntity::getUpdatedAt)
          .last("limit 1")
      );
      if (shipment == null) {
        return callbackResponse(true, "本地未找到物流单号，已忽略");
      }
      OrderEntity order = orderMapper.selectById(shipment.getOrderId());
      if (order == null) {
        return callbackResponse(true, "本地未找到订单，已忽略");
      }

      QueryResult result = parseTrackResult(resultNode, payload);
      OrderShipmentTrackEntity track = persistResult(order, shipment, result, "PUSH_SYNCED");
      syncMapTrackQuietly(order, shipment, track, receiverPhone(order));
      return callbackResponse(true, "成功");
    } catch (JsonProcessingException exception) {
      return callbackResponse(false, "回调参数格式错误");
    }
  }

  public OrderShipmentTrackDto getTrackDto(String shipmentId) {
    if (!StringUtils.hasText(shipmentId)) {
      return null;
    }
    OrderShipmentTrackEntity track = findByShipmentId(shipmentId);
    return track == null ? null : toDto(track);
  }

  private void subscribe(OrderEntity order, OrderShipmentEntity shipment, String receiverPhone) {
    if (!StringUtils.hasText(shipment.getLogisticsNo())) {
      return;
    }
    String kuaidicom = resolveKuaidicom(shipment);
    OrderShipmentTrackEntity track = ensureTrack(order, shipment, kuaidicom);
    List<String> missing = missingTrackConfig(true);
    if (!missing.isEmpty()) {
      markTrack(track, "NOT_CONFIGURED", "快递100轨迹配置缺失：" + String.join(", ", missing), null);
      return;
    }

    try {
      Map<String, Object> parameters = new LinkedHashMap<>();
      parameters.put("callbackurl", trackCallbackUrl());
      if (StringUtils.hasText(receiverPhone)) {
        parameters.put("phone", receiverPhone.trim());
      }
      Map<String, Object> param = new LinkedHashMap<>();
      param.put("company", kuaidicom);
      param.put("number", shipment.getLogisticsNo());
      param.put("key", properties.getKey());
      param.put("parameters", parameters);

      String paramJson = objectMapper.writeValueAsString(param);
      Map<String, String> form = new LinkedHashMap<>();
      form.put("schema", "json");
      form.put("param", paramJson);
      form.put("sign", md5Upper(paramJson + properties.getKey() + trackCustomer()));
      HttpResponse<String> response = postForm(properties.getTrackSubscribeUrl(), form);
      JsonNode payload = objectMapper.readTree(response.body());
      boolean ok = payload.path("result").asBoolean(false) ||
        "200".equals(payload.path("returnCode").asText(""));
      markTrack(
        track,
        ok ? "SUBSCRIBED" : "SUBSCRIBE_FAILED",
        payload.path("message").asText(ok ? "已订阅快递100轨迹" : "快递100轨迹订阅失败"),
        payload
      );
    } catch (IOException | InterruptedException exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      markTrack(track, "SUBSCRIBE_FAILED", "快递100轨迹订阅请求失败", null);
    }
  }

  private QueryResult queryTrack(OrderShipmentEntity shipment, String receiverPhone) {
    List<String> missing = missingTrackConfig(false);
    if (!missing.isEmpty()) {
      throw new ApiException(
        "KUAIDI100_TRACK_CONFIG_MISSING",
        "快递100轨迹配置缺失：" + String.join(", ", missing),
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      Map<String, Object> param = new LinkedHashMap<>();
      param.put("com", resolveKuaidicom(shipment));
      param.put("num", shipment.getLogisticsNo());
      param.put("resultv2", "1");
      if (StringUtils.hasText(receiverPhone)) {
        param.put("phone", receiverPhone.trim());
      }
      String paramJson = objectMapper.writeValueAsString(param);
      Map<String, String> form = new LinkedHashMap<>();
      form.put("customer", trackCustomer());
      form.put("sign", md5Upper(paramJson + properties.getKey() + trackCustomer()));
      form.put("param", paramJson);
      HttpResponse<String> response = postForm(properties.getTrackQueryUrl(), form);
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new ApiException("KUAIDI100_TRACK_FAILED", "快递100轨迹查询失败", HttpStatus.BAD_GATEWAY);
      }
      JsonNode payload = objectMapper.readTree(response.body());
      if (!"200".equals(payload.path("status").asText("200")) && !payload.path("message").asText("").equalsIgnoreCase("ok")) {
        String message = payload.path("message").asText("快递100轨迹查询失败");
        throw new ApiException("KUAIDI100_TRACK_FAILED", message, HttpStatus.BAD_GATEWAY);
      }
      return parseTrackResult(payload, payload);
    } catch (ApiException exception) {
      throw exception;
    } catch (IOException | InterruptedException exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      throw new ApiException("KUAIDI100_TRACK_FAILED", "快递100轨迹查询失败", HttpStatus.BAD_GATEWAY);
    }
  }

  private void syncMapTrackQuietly(
    OrderEntity order,
    OrderShipmentEntity shipment,
    OrderShipmentTrackEntity track,
    String receiverPhone
  ) {
    try {
      syncMapTrack(order, shipment, track, receiverPhone);
    } catch (RuntimeException ignored) {
      // 地图轨迹是增强展示，失败不影响文字轨迹和订单主流程。
    }
  }

  private void syncMapTrack(
    OrderEntity order,
    OrderShipmentEntity shipment,
    OrderShipmentTrackEntity track,
    String receiverPhone
  ) {
    if (!StringUtils.hasText(shipment.getLogisticsNo())) {
      return;
    }
    if (track.getMapSyncedAt() != null && track.getMapSyncedAt().isAfter(LocalDateTime.now().minusMinutes(30))) {
      return;
    }
    List<String> missing = missingTrackConfig(false);
    if (!missing.isEmpty()) {
      markMapTrack(track, "NOT_CONFIGURED", "快递100地图轨迹配置缺失：" + String.join(", ", missing), null);
      return;
    }
    String from = senderAddress(order);
    String to = receiverAddress(order);
    if (!StringUtils.hasText(from) || !StringUtils.hasText(to)) {
      markMapTrack(track, "ADDRESS_REQUIRED", "发货地或收货地不完整，暂不能生成物流地图", null);
      return;
    }

    try {
      Map<String, Object> param = new LinkedHashMap<>();
      param.put("com", resolveKuaidicom(shipment));
      param.put("num", shipment.getLogisticsNo());
      if (StringUtils.hasText(receiverPhone)) {
        param.put("phone", receiverPhone.trim());
      }
      param.put("from", from);
      param.put("to", to);
      param.put("resultv2", "5");
      param.put("show", "0");
      param.put("order", "desc");
      if (StringUtils.hasText(properties.getTrackMapConfigKey())) {
        param.put("mapConfigKey", properties.getTrackMapConfigKey().trim());
      }
      String paramJson = objectMapper.writeValueAsString(param);
      Map<String, String> form = new LinkedHashMap<>();
      form.put("customer", trackCustomer());
      form.put("sign", md5Upper(paramJson + properties.getKey() + trackCustomer()));
      form.put("param", paramJson);
      HttpResponse<String> response = postForm(properties.getTrackMapUrl(), form);
      JsonNode payload = objectMapper.readTree(response.body());
      String trailUrl = payload.path("trailUrl").asText("");
      boolean ok = response.statusCode() >= 200 &&
        response.statusCode() < 300 &&
        StringUtils.hasText(trailUrl);
      track.setMapStatus(ok ? "MAP_SYNCED" : "MAP_UNAVAILABLE");
      track.setMapMessage(payload.path("message").asText(ok ? "地图轨迹已同步" : "快递100暂未返回地图轨迹"));
      track.setMapTrailUrl(StringUtils.hasText(trailUrl) ? trailUrl : null);
      track.setMapArrivalTime(textOrNull(payload.path("arrivalTime").asText(null)));
      track.setMapTotalTime(textOrNull(payload.path("totalTime").asText(null)));
      track.setMapRemainTime(textOrNull(payload.path("remainTime").asText(null)));
      track.setMapSyncedAt(LocalDateTime.now());
      track.setMapRawJson(json(payload));
      track.setUpdatedAt(LocalDateTime.now());
      trackMapper.updateById(track);
    } catch (IOException | InterruptedException exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      markMapTrack(track, "MAP_FAILED", "快递100地图轨迹请求失败", null);
    }
  }

  private QueryResult parseTrackResult(JsonNode resultNode, JsonNode raw) {
    List<TrackEvent> events = new ArrayList<>();
    JsonNode data = resultNode.path("data");
    if (data.isArray()) {
      int index = 0;
      for (JsonNode item : data) {
        events.add(new TrackEvent(
          item.path("context").asText(item.path("content").asText("")),
          firstText(item.path("areaName").asText(null), item.path("location").asText(null)),
          parseTrackTime(firstText(item.path("time").asText(null), item.path("ftime").asText(null))),
          item.path("status").asText(null),
          index++,
          item
        ));
      }
    }
    LocalDateTime lastTraceTime = events.isEmpty() ? null : events.getFirst().eventTime();
    String stateCode = resultNode.path("state").asText(null);
    return new QueryResult(
      resultNode.path("nu").asText(resultNode.path("number").asText(null)),
      resultNode.path("com").asText(resultNode.path("company").asText(null)),
      stateCode,
      stateText(stateCode),
      lastTraceTime,
      events,
      raw
    );
  }

  private OrderShipmentTrackEntity persistResult(
    OrderEntity order,
    OrderShipmentEntity shipment,
    QueryResult result,
    String subscribeStatus
  ) {
    String kuaidicom = firstText(result.kuaidicom(), resolveKuaidicom(shipment));
    OrderShipmentTrackEntity track = ensureTrack(order, shipment, kuaidicom);
    track.setLogisticsNo(firstText(result.logisticsNo(), shipment.getLogisticsNo()));
    track.setKuaidicom(kuaidicom);
    track.setStateCode(result.stateCode());
    track.setStateText(result.stateText());
    track.setSubscribeStatus(subscribeStatus);
    track.setSubscribeMessage("3".equals(result.stateCode()) ? "已签收" : "轨迹已同步");
    track.setLastTraceTime(result.lastTraceTime());
    track.setLastSyncAt(LocalDateTime.now());
    track.setRawJson(json(result.raw()));
    track.setUpdatedAt(LocalDateTime.now());
    trackMapper.updateById(track);

    eventMapper.deleteByTrackId(track.getId());
    for (TrackEvent event : result.events()) {
      OrderShipmentTrackEventEntity entity = new OrderShipmentTrackEventEntity();
      entity.setId(id());
      entity.setTrackId(track.getId());
      entity.setShipmentId(shipment.getId());
      entity.setContent(event.content());
      entity.setLocation(event.location());
      entity.setEventTime(event.eventTime());
      entity.setStatus(event.status());
      entity.setSortOrder(event.sortOrder());
      entity.setRawJson(json(event.raw()));
      entity.setCreatedAt(LocalDateTime.now());
      eventMapper.insert(entity);
    }
    if ("3".equals(result.stateCode()) && shipment.getSignedAt() == null) {
      shipment.setSignedAt(result.lastTraceTime() == null ? LocalDateTime.now() : result.lastTraceTime());
      shipment.setStatus("SIGNED");
      shipment.setUpdatedAt(LocalDateTime.now());
      orderShipmentMapper.updateById(shipment);
    }
    return track;
  }

  private OrderShipmentTrackDto toDto(OrderShipmentTrackEntity track) {
    List<OrderShipmentTrackEventDto> events = eventMapper.selectList(
      new LambdaQueryWrapper<OrderShipmentTrackEventEntity>()
        .eq(OrderShipmentTrackEventEntity::getTrackId, track.getId())
        .orderByAsc(OrderShipmentTrackEventEntity::getSortOrder)
    )
      .stream()
      .map(event -> new OrderShipmentTrackEventDto(
        event.getContent(),
        event.getEventTime(),
        event.getLocation(),
        event.getStatus()
      ))
      .toList();
    return new OrderShipmentTrackDto(
      track.getLogisticsNo(),
      track.getKuaidicom(),
      track.getStateCode(),
      track.getStateText(),
      track.getSubscribeStatus(),
      track.getSubscribeMessage(),
      track.getLastTraceTime(),
      track.getLastSyncAt(),
      track.getMapStatus(),
      track.getMapMessage(),
      track.getMapTrailUrl(),
      track.getMapArrivalTime(),
      track.getMapTotalTime(),
      track.getMapRemainTime(),
      track.getMapSyncedAt(),
      events
    );
  }

  private OrderShipmentTrackEntity ensureTrack(
    OrderEntity order,
    OrderShipmentEntity shipment,
    String kuaidicom
  ) {
    OrderShipmentTrackEntity track = findByShipmentId(shipment.getId());
    if (track != null) {
      return track;
    }
    LocalDateTime now = LocalDateTime.now();
    track = new OrderShipmentTrackEntity();
    track.setId(id());
    track.setOrderId(order.getId());
    track.setShipmentId(shipment.getId());
    track.setLogisticsNo(shipment.getLogisticsNo());
    track.setKuaidicom(kuaidicom);
    track.setSubscribeStatus("PENDING");
    track.setSubscribeMessage("等待同步轨迹");
    track.setCreatedAt(now);
    track.setUpdatedAt(now);
    trackMapper.insert(track);
    return track;
  }

  private OrderShipmentTrackEntity findByShipmentId(String shipmentId) {
    return trackMapper.selectOne(
      new LambdaQueryWrapper<OrderShipmentTrackEntity>()
        .eq(OrderShipmentTrackEntity::getShipmentId, shipmentId)
        .last("limit 1")
    );
  }

  private void markTrack(OrderShipmentTrackEntity track, String status, String message, JsonNode raw) {
    track.setSubscribeStatus(status);
    track.setSubscribeMessage(message);
    track.setLastSyncAt(LocalDateTime.now());
    track.setRawJson(raw == null ? track.getRawJson() : json(raw));
    track.setUpdatedAt(LocalDateTime.now());
    trackMapper.updateById(track);
  }

  private void markMapTrack(OrderShipmentTrackEntity track, String status, String message, JsonNode raw) {
    track.setMapStatus(status);
    track.setMapMessage(message);
    track.setMapSyncedAt(LocalDateTime.now());
    track.setMapRawJson(raw == null ? track.getMapRawJson() : json(raw));
    track.setUpdatedAt(LocalDateTime.now());
    trackMapper.updateById(track);
  }

  private HttpResponse<String> postForm(String url, Map<String, String> form)
    throws IOException, InterruptedException {
    HttpRequest request = HttpRequest
      .newBuilder(URI.create(url))
      .timeout(Duration.ofSeconds(12))
      .header("content-type", "application/x-www-form-urlencoded;charset=UTF-8")
      .POST(HttpRequest.BodyPublishers.ofString(formBody(form)))
      .build();
    return httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
  }

  private List<String> missingTrackConfig(boolean subscribe) {
    List<String> missing = new ArrayList<>();
    if (!StringUtils.hasText(properties.getKey())) {
      missing.add("KUAIDI100_KEY");
    }
    if (!StringUtils.hasText(trackCustomer())) {
      missing.add("KUAIDI100_CUSTOMER");
    }
    if (subscribe && !StringUtils.hasText(trackCallbackUrl())) {
      missing.add("KUAIDI100_TRACK_CALLBACK_URL");
    }
    return missing;
  }

  private String trackCustomer() {
    return firstText(properties.getCustomer(), properties.getSecret());
  }

  private String trackCallbackUrl() {
    return firstText(
      properties.getTrackCallbackUrl(),
      firstText(properties.getPollCallbackUrl(), properties.getCallbackUrl())
    );
  }

  private String resolveKuaidicom(OrderShipmentEntity shipment) {
    return firstText(shipment.getKuaidicom(), properties.getKuaidicom());
  }

  private String receiverPhone(OrderEntity order) {
    try {
      JsonNode node = objectMapper.readTree(order.getAddressSnapshot());
      return node.path("receiverPhone").asText(null);
    } catch (Exception exception) {
      return null;
    }
  }

  private String receiverAddress(OrderEntity order) {
    try {
      JsonNode node = objectMapper.readTree(order.getAddressSnapshot());
      return List
        .of(
          nullToBlank(node.path("province").asText(null)),
          nullToBlank(node.path("city").asText(null)),
          nullToBlank(node.path("district").asText(null)),
          nullToBlank(node.path("detail").asText(null))
        )
        .stream()
        .filter(StringUtils::hasText)
        .reduce("", String::concat);
    } catch (Exception exception) {
      return null;
    }
  }

  private String senderAddress(OrderEntity order) {
    try {
      Kuaidi100PrintConfig config = printerService.resolvePrintConfig(order.getStoreId(), null);
      String configured = textOrNull(config.senderAddress());
      if (StringUtils.hasText(configured)) {
        return configured;
      }
    } catch (RuntimeException exception) {
      // 继续使用门店地址兜底。
    }
    StoreEntity store = storeMapper.selectById(order.getStoreId());
    if (store == null) {
      return null;
    }
    return List
      .of(
        nullToBlank(store.getProvince()),
        nullToBlank(store.getCity()),
        nullToBlank(store.getDistrict()),
        nullToBlank(store.getAddress())
      )
      .stream()
      .filter(StringUtils::hasText)
      .reduce("", String::concat);
  }

  private LocalDateTime parseTrackTime(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return LocalDateTime.parse(value.trim(), TRACK_TIME_FORMAT);
    } catch (DateTimeParseException exception) {
      return null;
    }
  }

  private String stateText(String stateCode) {
    return switch (stateCode == null ? "" : stateCode) {
      case "0" -> "在途";
      case "1" -> "揽收";
      case "2" -> "疑难";
      case "3" -> "已签收";
      case "4" -> "退签";
      case "5" -> "派件";
      case "6" -> "退回";
      case "7" -> "转投";
      case "10" -> "待清关";
      case "14" -> "拒签";
      default -> null;
    };
  }

  private Map<String, Object> callbackResponse(boolean success, String message) {
    return Map.of(
      "result", success,
      "returnCode", success ? "200" : "500",
      "message", message
    );
  }

  private String formBody(Map<String, String> values) {
    return values
      .entrySet()
      .stream()
      .map(entry -> urlEncode(entry.getKey()) + "=" + urlEncode(entry.getValue()))
      .reduce((left, right) -> left + "&" + right)
      .orElse("");
  }

  private String urlEncode(String value) {
    return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
  }

  private String md5Upper(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("MD5");
      return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8))).toUpperCase();
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("MD5 unavailable", exception);
    }
  }

  private String json(JsonNode node) {
    try {
      return objectMapper.writeValueAsString(node);
    } catch (JsonProcessingException exception) {
      return "{}";
    }
  }

  private String firstText(String... values) {
    for (String value : values) {
      if (StringUtils.hasText(value)) {
        return value;
      }
    }
    return null;
  }

  private String textOrNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private String nullToBlank(String value) {
    return value == null ? "" : value.trim();
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private record QueryResult(
    String logisticsNo,
    String kuaidicom,
    String stateCode,
    String stateText,
    LocalDateTime lastTraceTime,
    List<TrackEvent> events,
    JsonNode raw
  ) {}

  private record TrackEvent(
    String content,
    String location,
    LocalDateTime eventTime,
    String status,
    int sortOrder,
    JsonNode raw
  ) {}
}
