package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.AdminOrderBatchShipFailureDto;
import cn.hentor.vegetables.dto.AdminOrderBatchShipRequest;
import cn.hentor.vegetables.dto.AdminOrderBatchShipResponse;
import cn.hentor.vegetables.dto.AdminOrderBatchShipSuccessDto;
import cn.hentor.vegetables.dto.AdminOrderBatchShipmentInput;
import cn.hentor.vegetables.dto.AdminOrderBenefitItemDto;
import cn.hentor.vegetables.dto.AdminOrderCreateRequest;
import cn.hentor.vegetables.dto.AdminOrderDetailDto;
import cn.hentor.vegetables.dto.AdminOrderDetailResponse;
import cn.hentor.vegetables.dto.AdminOrderItemDto;
import cn.hentor.vegetables.dto.AdminOrderRemarkRequest;
import cn.hentor.vegetables.dto.AdminOrderRemarkResponse;
import cn.hentor.vegetables.dto.AdminOrderRemarkResultDto;
import cn.hentor.vegetables.dto.AdminOrderShipOrderDto;
import cn.hentor.vegetables.dto.AdminOrderShipRequest;
import cn.hentor.vegetables.dto.AdminOrderShipResponse;
import cn.hentor.vegetables.dto.AdminOrderShipmentDto;
import cn.hentor.vegetables.dto.AdminOrderShipmentInput;
import cn.hentor.vegetables.dto.AdminOrderStatusActionRequest;
import cn.hentor.vegetables.dto.AdminOrderStatusResponse;
import cn.hentor.vegetables.dto.AdminOrderStatusResultDto;
import cn.hentor.vegetables.dto.AdminOrderStoreDto;
import cn.hentor.vegetables.dto.AdminOrderUserDto;
import cn.hentor.vegetables.dto.AdminOrderUserPackageDto;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.Kuaidi100CloudPrintRequest;
import cn.hentor.vegetables.dto.Kuaidi100CloudPrintResponse;
import cn.hentor.vegetables.dto.Kuaidi100PrintFailureDto;
import cn.hentor.vegetables.dto.Kuaidi100PrintResultDto;
import cn.hentor.vegetables.dto.Kuaidi100PrintTaskDto;
import cn.hentor.vegetables.dto.Kuaidi100PrintUpdatedDto;
import cn.hentor.vegetables.dto.MiniReservationRequest;
import cn.hentor.vegetables.dto.MiniReservationResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.dto.OrderExportResult;
import cn.hentor.vegetables.dto.OrderListItem;
import cn.hentor.vegetables.dto.OrderPrintLabelResult;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.OrderBenefitItemEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderItemEntity;
import cn.hentor.vegetables.entity.OrderShipmentEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.entity.UserPackageEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.DishMapper;
import cn.hentor.vegetables.mapper.OrderBenefitItemMapper;
import cn.hentor.vegetables.mapper.OrderItemMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import cn.hentor.vegetables.mapper.OrderShipmentMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import cn.hentor.vegetables.mapper.UserPackageBenefitMapper;
import cn.hentor.vegetables.mapper.UserPackageMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.yulichang.wrapper.MPJLambdaWrapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class OrderQueryService {
  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final DishMapper dishMapper;
  private final Kuaidi100Service kuaidi100Service;
  private final MiniReservationService miniReservationService;
  private final ObjectMapper objectMapper;
  private final OrderBenefitItemMapper orderBenefitItemMapper;
  private final OrderItemMapper orderItemMapper;
  private final OrderMapper orderMapper;
  private final OrderShipmentMapper orderShipmentMapper;
  private final StoreMapper storeMapper;
  private final UserMapper userMapper;
  private final UserPackageBenefitMapper userPackageBenefitMapper;
  private final UserPackageMapper userPackageMapper;

  public OrderQueryService(
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    DishMapper dishMapper,
    Kuaidi100Service kuaidi100Service,
    MiniReservationService miniReservationService,
    ObjectMapper objectMapper,
    OrderBenefitItemMapper orderBenefitItemMapper,
    OrderItemMapper orderItemMapper,
    OrderMapper orderMapper,
    OrderShipmentMapper orderShipmentMapper,
    StoreMapper storeMapper,
    UserMapper userMapper,
    UserPackageBenefitMapper userPackageBenefitMapper,
    UserPackageMapper userPackageMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.dishMapper = dishMapper;
    this.kuaidi100Service = kuaidi100Service;
    this.miniReservationService = miniReservationService;
    this.objectMapper = objectMapper;
    this.orderBenefitItemMapper = orderBenefitItemMapper;
    this.orderItemMapper = orderItemMapper;
    this.orderMapper = orderMapper;
    this.orderShipmentMapper = orderShipmentMapper;
    this.storeMapper = storeMapper;
    this.userMapper = userMapper;
    this.userPackageBenefitMapper = userPackageBenefitMapper;
    this.userPackageMapper = userPackageMapper;
  }

  public PageResult<OrderListItem> listOrders(
    String storeId,
    String status,
    String query,
    long page,
    long pageSize
  ) {
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    MPJLambdaWrapper<OrderEntity> wrapper = new MPJLambdaWrapper<OrderEntity>()
      .selectAs(OrderEntity::getId, OrderListItem::getId)
      .selectAs(OrderEntity::getOrderNo, OrderListItem::getOrderNo)
      .selectAs(OrderEntity::getStatus, OrderListItem::getStatus)
      .selectAs(OrderEntity::getTotalWeightJin, OrderListItem::getTotalWeightJin)
      .selectAs(OrderEntity::getLogisticsNo, OrderListItem::getLogisticsNo)
      .selectAs(OrderEntity::getCreatedAt, OrderListItem::getCreatedAt)
      .selectAs(UserEntity::getNickname, OrderListItem::getUserNickname)
      .selectAs(UserEntity::getPhone, OrderListItem::getUserPhone)
      .selectAs(UserPackageEntity::getNameSnapshot, OrderListItem::getPackageName)
      .leftJoin(UserEntity.class, UserEntity::getId, OrderEntity::getUserId)
      .leftJoin(
        UserPackageEntity.class,
        UserPackageEntity::getId,
        OrderEntity::getUserPackageId
      )
      .eq(OrderEntity::getStoreId, storeId)
      .isNull(OrderEntity::getDeletedByUserAt)
      .orderByDesc(OrderEntity::getCreatedAt);

    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      wrapper.apply("t.\"status\" = {0}::\"OrderStatus\"", status.trim());
    }

    if (StringUtils.hasText(query)) {
      String keyword = query.trim();
      wrapper.and(w -> w
        .like(OrderEntity::getOrderNo, keyword)
        .or()
        .like(UserEntity::getNickname, keyword)
        .or()
        .like(UserEntity::getPhone, keyword)
      );
    }

    Page<OrderListItem> result = orderMapper.selectJoinPage(
      new Page<>(normalizedPage, normalizedPageSize),
      OrderListItem.class,
      wrapper
    );

    long totalPages =
      result.getSize() == 0 ? 0 : (long) Math.ceil((double) result.getTotal() / result.getSize());
    return new PageResult<>(
      result.getRecords(),
      result.getCurrent(),
      result.getSize(),
      result.getTotal(),
      totalPages
    );
  }

  public AdminOrderDetailResponse getOrder(String storeId, String orderId) {
    return new AdminOrderDetailResponse(toDetailDto(loadOrderView(orderId, storeId)));
  }

  @Transactional
  public AdminOrderDetailResponse createOrder(
    AdminOrderCreateRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity store = storeMapper.selectById(request.storeId());
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }
    if (!StringUtils.hasText(store.getCode())) {
      throw new ApiException("STORE_CODE_REQUIRED", "门店编码缺失", HttpStatus.BAD_REQUEST);
    }

    MiniReservationResponse submitted;
    try {
      submitted = miniReservationService.submit(
        new MiniSessionContext("", request.userId(), "", request.storeId()),
        new MiniReservationRequest(
          request.addressId(),
          request.benefitSelections(),
          request.items(),
          null,
          store.getCode(),
          request.userPackageId(),
          request.userVisibleRemark()
        )
      );
    } catch (ApiException exception) {
      throw normalizeAdminCreateError(exception);
    }

    String internalRemark = normalizeNullableText(request.internalRemark());
    if (StringUtils.hasText(internalRemark)) {
      OrderEntity update = new OrderEntity();
      update.setId(submitted.reservation().id());
      update.setInternalRemark(internalRemark);
      update.setUpdatedAt(LocalDateTime.now());
      orderMapper.updateInternalRemark(update);
    }

    writeOperationLog(
      operator.getId(),
      request.storeId(),
      "order",
      submitted.reservation().id(),
      "ORDER_CREATED",
      Map.of(),
      Map.of(
        "benefitCount",
        submitted.reservation().benefits().size(),
        "internalRemark",
        nullToBlank(internalRemark),
        "itemCount",
        submitted.reservation().items().size(),
        "orderNo",
        submitted.reservation().orderNo(),
        "source",
        "ADMIN",
        "totalWeightJin",
        zeroIfNull(submitted.reservation().totalWeightJin())
      )
    );

    return new AdminOrderDetailResponse(
      toDetailDto(loadOrderView(submitted.reservation().id(), request.storeId()))
    );
  }

  public OrderExportResult exportOrders(
    String storeId,
    String status,
    String query,
    String dateFrom,
    String dateTo
  ) {
    List<OrderView> orders = findExportOrderIds(storeId, status, query, dateFrom, dateTo)
      .stream()
      .map(orderId -> loadOrderView(orderId, storeId))
      .toList();
    List<String> rows = new ArrayList<>();
    rows.add("订单号,状态,会员,手机号,套餐,总重量(斤),菜品明细,配送地址,运单号,会员备注,内部备注,下单时间");
    rows.addAll(orders.stream().map(this::toCsvRow).toList());
    String csvText = "\uFEFF" + String.join("\n", rows);
    return new OrderExportResult(csvText, orders.size());
  }

  @Transactional
  public AdminOrderRemarkResponse updateInternalRemark(
    String orderId,
    AdminOrderRemarkRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    OrderView order = loadOrderView(orderId, request.storeId());
    String internalRemark = normalizeNullableText(request.internalRemark());
    LocalDateTime now = LocalDateTime.now();

    OrderEntity update = new OrderEntity();
    update.setId(order.order().getId());
    update.setInternalRemark(internalRemark);
    update.setUpdatedAt(now);
    orderMapper.updateInternalRemark(update);

    Map<String, Object> before = new LinkedHashMap<>();
    before.put("internalRemark", order.order().getInternalRemark());
    Map<String, Object> after = new LinkedHashMap<>();
    after.put("internalRemark", internalRemark);
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      "order",
      order.order().getId(),
      "ORDER_INTERNAL_REMARK_UPDATED",
      before,
      after
    );

    return new AdminOrderRemarkResponse(
      new AdminOrderRemarkResultDto(order.order().getId(), internalRemark)
    );
  }

  @Transactional
  public AdminOrderBatchShipResponse batchShipOrders(
    AdminOrderBatchShipRequest request,
    AdminSessionDto session
  ) {
    List<AdminOrderBatchShipmentInput> shipments = dedupeBatchShipments(request.shipments());
    if (shipments.isEmpty()) {
      throw new ApiException("BATCH_SHIPMENTS_REQUIRED", "请选择要发货的订单", HttpStatus.BAD_REQUEST);
    }

    List<AdminOrderBatchShipFailureDto> failures = new ArrayList<>();
    List<AdminOrderBatchShipSuccessDto> successes = new ArrayList<>();
    for (AdminOrderBatchShipmentInput shipment : shipments) {
      try {
        AdminOrderShipResponse response = shipOrder(
          shipment.orderId(),
          new AdminOrderShipRequest(
            shipment.logisticsNo(),
            List.of(new AdminOrderShipmentInput(shipment.logisticsNo(), "蔬菜包裹", "VEGETABLE")),
            request.storeId()
          ),
          session
        );
        successes.add(
          new AdminOrderBatchShipSuccessDto(
            response.order().logisticsNo(),
            response.order().id(),
            response.order().shippedAt(),
            response.order().status()
          )
        );
      } catch (ApiException exception) {
        failures.add(
          new AdminOrderBatchShipFailureDto(
            exception.getCode(),
            shipment.logisticsNo(),
            exception.getMessage(),
            shipment.orderId()
          )
        );
      }
    }

    return new AdminOrderBatchShipResponse(
      failures.size(),
      failures,
      successes.size(),
      successes
    );
  }

  @Transactional
  public AdminOrderStatusResponse signOrder(
    String orderId,
    AdminOrderStatusActionRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    OrderView order = loadOrderView(orderId, request.storeId());
    if (!"SHIPPED".equals(order.order().getStatus())) {
      throw new ApiException("ORDER_NOT_SIGNABLE", "当前订单不可签收", HttpStatus.CONFLICT);
    }

    LocalDateTime now = LocalDateTime.now();
    OrderEntity update = new OrderEntity();
    update.setId(order.order().getId());
    update.setSignedAt(now);
    update.setUpdatedAt(now);
    orderMapper.markSigned(update);

    Map<String, Object> before = new LinkedHashMap<>();
    before.put("signedAt", order.order().getSignedAt());
    before.put("status", order.order().getStatus());
    Map<String, Object> after = new LinkedHashMap<>();
    after.put("signedAt", now);
    after.put("status", "SIGNED");
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      "order",
      order.order().getId(),
      "ORDER_SIGNED",
      before,
      after
    );

    return new AdminOrderStatusResponse(
      new AdminOrderStatusResultDto(null, null, order.order().getId(), now, "SIGNED")
    );
  }

  @Transactional
  public AdminOrderStatusResponse voidOrder(
    String orderId,
    AdminOrderStatusActionRequest request,
    AdminSessionDto session
  ) {
    String reason = normalizeNullableText(request.reason());
    if (!StringUtils.hasText(reason)) {
      throw new ApiException("VOID_REASON_REQUIRED", "请输入作废原因", HttpStatus.BAD_REQUEST);
    }

    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    OrderView order = loadOrderView(orderId, request.storeId());
    if (!"PENDING_SHIPMENT".equals(order.order().getStatus())) {
      throw new ApiException("ORDER_NOT_VOIDABLE", "当前订单不可作废", HttpStatus.CONFLICT);
    }

    LocalDateTime now = LocalDateTime.now();
    for (OrderItemEntity item : order.items()) {
      dishMapper.incrementStock(item.getDishId(), zeroIfNull(item.getWeightJin()), now);
    }
    if (order.userPackage().getUsedTimes() != null && order.userPackage().getUsedTimes() > 0) {
      userPackageMapper.decrementUsedTimes(order.userPackage().getId(), now);
    }
    for (OrderBenefitItemEntity benefit : order.benefits()) {
      if (StringUtils.hasText(benefit.getUserPackageBenefitId())) {
        userPackageBenefitMapper.decrementUsedQuantity(
          benefit.getUserPackageBenefitId(),
          zeroIfNull(benefit.getQuantity()),
          now
        );
      }
    }

    OrderEntity update = new OrderEntity();
    update.setId(order.order().getId());
    update.setCancelReason(reason);
    update.setCanceledAt(now);
    update.setUpdatedAt(now);
    orderMapper.markVoided(update);

    Map<String, Object> before = new LinkedHashMap<>();
    before.put("status", order.order().getStatus());
    before.put("usedTimes", order.userPackage().getUsedTimes());
    Map<String, Object> after = new LinkedHashMap<>();
    after.put("canceledAt", now);
    after.put("cancelReason", reason);
    after.put("restoredBenefits", benefitLogValue(order.benefits()));
    after.put("restoredItems", itemLogValue(order.items()));
    after.put("status", "VOIDED");
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      "order",
      order.order().getId(),
      "ORDER_VOIDED",
      before,
      after
    );

    return new AdminOrderStatusResponse(
      new AdminOrderStatusResultDto(now, reason, order.order().getId(), null, "VOIDED")
    );
  }

  @Transactional
  public AdminOrderShipResponse shipOrder(
    String orderId,
    AdminOrderShipRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    OrderView order = loadOrderView(orderId, request.storeId());
    if (!"PENDING_SHIPMENT".equals(order.order().getStatus())) {
      throw new ApiException("ORDER_NOT_SHIPPABLE", "当前订单不可发货", HttpStatus.CONFLICT);
    }

    List<NormalizedShipment> shipments = normalizeShipments(request);
    LocalDateTime shippedAt = LocalDateTime.now();
    List<OrderShipmentEntity> beforeShipments = order.shipments();
    orderShipmentMapper.deleteByOrderId(order.order().getId());

    List<OrderShipmentEntity> inserted = new ArrayList<>();
    for (NormalizedShipment shipment : shipments) {
      OrderShipmentEntity entity = new OrderShipmentEntity();
      entity.setId(id());
      entity.setOrderId(order.order().getId());
      entity.setPackageName(shipment.packageName());
      entity.setPackageType(shipment.packageType());
      entity.setLogisticsNo(shipment.logisticsNo());
      entity.setShippedAt(shippedAt);
      entity.setStatus("SHIPPED");
      entity.setSortOrder(shipment.sortOrder());
      entity.setCreatedAt(shippedAt);
      entity.setUpdatedAt(shippedAt);
      orderShipmentMapper.insert(entity);
      inserted.add(entity);
    }

    OrderEntity update = new OrderEntity();
    update.setId(order.order().getId());
    update.setLogisticsNo(inserted.getFirst().getLogisticsNo());
    update.setShippedAt(shippedAt);
    update.setUpdatedAt(shippedAt);
    orderMapper.markShipped(update);

    writeOperationLog(
      operator.getId(),
      request.storeId(),
      "order",
      order.order().getId(),
      "ORDER_SHIPPED",
      Map.of(
        "logisticsNo",
        nullToBlank(order.order().getLogisticsNo()),
        "shipments",
        shipmentLogValue(beforeShipments),
        "status",
        order.order().getStatus()
      ),
      Map.of(
        "logisticsNo",
        inserted.getFirst().getLogisticsNo(),
        "shipments",
        shipmentLogValue(inserted),
        "status",
        "SHIPPED"
      )
    );

    return new AdminOrderShipResponse(
      new AdminOrderShipOrderDto(
        order.order().getId(),
        inserted.getFirst().getLogisticsNo(),
        shippedAt,
        inserted.stream().map(this::toShipmentDto).toList(),
        "SHIPPED"
      )
    );
  }

  public OrderPrintLabelResult buildOrderPrintLabels(String storeId, List<String> orderIds) {
    List<OrderView> orders = loadOrderViews(storeId, orderIds, false);
    StringBuilder labels = new StringBuilder();

    for (OrderView order : orders) {
      Map<String, String> address = parseAddress(order.order().getAddressSnapshot());
      String logisticsNo = logisticsText(order);
      String itemHtml = order.items()
        .stream()
        .map(item ->
          "<span>" + escapeHtml(item.getDishNameSnapshot()) + " " + formatNumber(item.getWeightJin()) + "斤</span>"
        )
        .reduce("", String::concat);
      String benefitHtml = order.benefits()
        .stream()
        .map(benefit ->
          "<span>" +
          escapeHtml(benefit.getNameSnapshot()) +
          " " +
          formatNumber(benefit.getQuantity()) +
          escapeHtml(benefit.getUnitSnapshot()) +
          "</span>"
        )
        .reduce("", String::concat);

      labels.append(
        """
        <section class="label">
          <header><strong>%s</strong><span>%s</span></header>
          <div class="receiver">%s %s</div>
          <div class="address">%s</div>
          <div class="items">%s%s</div>
          <footer><span>合计 %s斤</span><span>%s</span></footer>
        </section>
        """.formatted(
          escapeHtml(order.store().getName()),
          escapeHtml(order.order().getOrderNo()),
          escapeHtml(address.get("receiverName")),
          escapeHtml(address.get("receiverPhone")),
          escapeHtml(shipmentAddressText(address)),
          itemHtml,
          benefitHtml,
          formatNumber(order.order().getTotalWeightJin()),
          escapeHtml(StringUtils.hasText(logisticsNo) ? logisticsNo : "未发货")
        )
      );
    }

    String html =
      """
      <!doctype html>
      <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>配送标签</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 16px; color: #12351f; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .toolbar { margin-bottom: 16px; }
          .toolbar button { border: 0; border-radius: 10px; background: #1f8f4f; color: white; font-weight: 700; padding: 10px 18px; }
          .label { break-inside: avoid; border: 1px solid #12351f; border-radius: 8px; margin-bottom: 12px; min-height: 210px; padding: 14px; width: 360px; }
          header, footer { align-items: center; display: flex; justify-content: space-between; gap: 12px; }
          header strong { font-size: 18px; }
          header span, footer span { font-size: 12px; }
          .receiver { font-size: 20px; font-weight: 800; margin-top: 14px; }
          .address { font-size: 15px; line-height: 1.5; margin-top: 8px; }
          .items { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
          .items span { border: 1px solid #dbe6dc; border-radius: 999px; padding: 4px 8px; }
          footer { border-top: 1px solid #dbe6dc; font-weight: 700; margin-top: 14px; padding-top: 10px; }
          @media print { body { padding: 0; } .toolbar { display: none; } .label { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="toolbar"><button onclick="window.print()">打印配送标签</button></div>
        %s
        <script>window.print();</script>
      </body>
      </html>
      """.formatted(labels);

    return new OrderPrintLabelResult(html, orders.size());
  }

  @Transactional
  public Kuaidi100CloudPrintResponse cloudPrint(
    Kuaidi100CloudPrintRequest request,
    AdminSessionDto session
  ) {
    requireActiveOperator(session.adminUserId());
    List<String> missingConfig = kuaidi100Service.missingConfig();
    if (!missingConfig.isEmpty()) {
      throw new ApiException(
        "KUAIDI100_CONFIG_MISSING",
        "快递100配置缺失：" + String.join(", ", missingConfig),
        HttpStatus.BAD_REQUEST
      );
    }

    List<OrderView> orders = loadOrderViews(request.storeId(), request.orderIds(), true);
    List<Kuaidi100PrintTaskDto> tasks = buildKuaidi100PrintTasks(
      orders,
      Boolean.TRUE.equals(request.includePrinted())
    );
    if (tasks.isEmpty()) {
      throw new ApiException("PRINT_TASKS_EMPTY", "所选订单没有待打印包裹", HttpStatus.BAD_REQUEST);
    }

    List<Kuaidi100PrintResultDto> successes = new ArrayList<>();
    List<Kuaidi100PrintFailureDto> failures = new ArrayList<>();
    for (Kuaidi100PrintTaskDto task : tasks) {
      try {
        successes.add(kuaidi100Service.submitCloudPrint(task));
      } catch (ApiException exception) {
        failures.add(
          new Kuaidi100PrintFailureDto(
            exception.getMessage(),
            task.orderNo(),
            task.packageName(),
            task.shipmentId()
          )
        );
      }
    }

    List<Kuaidi100PrintUpdatedDto> updated = successes.isEmpty()
      ? List.of()
      : recordKuaidi100PrintResults(request.storeId(), session.adminUserId(), successes);

    return new Kuaidi100CloudPrintResponse(
      failures.size(),
      failures,
      successes.size(),
      updated
    );
  }

  private List<Kuaidi100PrintTaskDto> buildKuaidi100PrintTasks(
    List<OrderView> orders,
    boolean includePrinted
  ) {
    List<Kuaidi100PrintTaskDto> tasks = new ArrayList<>();
    for (OrderView order : orders) {
      Map<String, String> receiver = parseAddress(order.order().getAddressSnapshot());
      String receiverName = receiver.get("receiverName");
      String receiverMobile = receiver.get("receiverPhone");
      String receiverAddress = shipmentAddressText(receiver);
      String senderName = firstText(order.store().getContactName(), order.store().getName());
      String senderMobile = order.store().getContactPhone();
      String senderAddress = List
        .of(
          nullToBlank(order.store().getProvince()),
          nullToBlank(order.store().getCity()),
          nullToBlank(order.store().getDistrict()),
          nullToBlank(order.store().getAddress())
        )
        .stream()
        .filter(StringUtils::hasText)
        .reduce("", String::concat);

      if (!StringUtils.hasText(receiverName) || !StringUtils.hasText(receiverMobile) || !StringUtils.hasText(receiverAddress)) {
        throw new ApiException(
          "PRINT_RECEIVER_REQUIRED",
          order.order().getOrderNo() + " 收件信息不完整",
          HttpStatus.BAD_REQUEST
        );
      }
      if (!StringUtils.hasText(senderName) || !StringUtils.hasText(senderMobile) || !StringUtils.hasText(senderAddress)) {
        throw new ApiException(
          "PRINT_SENDER_REQUIRED",
          order.order().getOrderNo() + " 寄件信息不完整",
          HttpStatus.BAD_REQUEST
        );
      }

      for (OrderShipmentEntity shipment : ensurePendingShipments(order)) {
        if (!includePrinted && StringUtils.hasText(shipment.getLogisticsNo())) {
          continue;
        }
        List<String> content = packageContentForShipment(shipment, order);
        tasks.add(
          new Kuaidi100PrintTaskDto(
            content.isEmpty() ? shipment.getPackageName() : String.join("；", content),
            "1",
            order.order().getId(),
            order.order().getOrderNo(),
            shipment.getPackageName(),
            shipment.getPackageType(),
            receiverAddress,
            receiverMobile,
            receiverName,
            List
              .of(nullToBlank(shipment.getPackageName()), nullToBlank(order.order().getUserVisibleRemark()))
              .stream()
              .filter(StringUtils::hasText)
              .reduce((left, right) -> left + "；" + right)
              .orElse(""),
            senderAddress,
            senderMobile,
            senderName,
            shipment.getId(),
            "VEGETABLE".equals(shipment.getPackageType())
              ? maxWeightKg(order.order().getTotalWeightJin())
              : "1"
          )
        );
      }
    }
    return tasks;
  }

  private List<Kuaidi100PrintUpdatedDto> recordKuaidi100PrintResults(
    String storeId,
    String operatorId,
    List<Kuaidi100PrintResultDto> results
  ) {
    LocalDateTime now = LocalDateTime.now();
    List<Kuaidi100PrintUpdatedDto> updated = new ArrayList<>();
    Set<String> orderIds = new LinkedHashSet<>();

    for (Kuaidi100PrintResultDto result : results) {
      OrderShipmentEntity shipment = orderShipmentMapper.selectById(result.shipmentId());
      if (shipment == null) {
        continue;
      }
      OrderEntity order = orderMapper.selectById(shipment.getOrderId());
      if (order == null || !Objects.equals(order.getStoreId(), storeId)) {
        continue;
      }

      shipment.setLogisticsNo(result.kuaidinum());
      shipment.setRemark(StringUtils.hasText(result.taskId()) ? "快递100任务：" + result.taskId() : shipment.getRemark());
      shipment.setShippedAt(now);
      shipment.setUpdatedAt(now);
      orderShipmentMapper.markPrinted(shipment);

      orderIds.add(order.getId());
      updated.add(
        new Kuaidi100PrintUpdatedDto(
          result.kuaidinum(),
          order.getId(),
          shipment.getId(),
          result.taskId()
        )
      );
    }

    for (String orderId : orderIds) {
      List<OrderShipmentEntity> shipments = loadShipments(orderId);
      String logisticsNo = shipments
        .stream()
        .map(OrderShipmentEntity::getLogisticsNo)
        .filter(StringUtils::hasText)
        .findFirst()
        .orElse(null);
      if (!StringUtils.hasText(logisticsNo)) {
        continue;
      }

      OrderEntity update = new OrderEntity();
      update.setId(orderId);
      update.setLogisticsNo(logisticsNo);
      update.setShippedAt(now);
      update.setUpdatedAt(now);
      orderMapper.markShipped(update);
      writeOperationLog(
        operatorId,
        storeId,
        "order",
        orderId,
        "KUAIDI100_PRINTED",
        Map.of(),
        Map.of("logisticsNo", logisticsNo, "shipments", shipmentLogValue(shipments))
      );
    }

    return updated;
  }

  private List<OrderShipmentEntity> ensurePendingShipments(OrderView order) {
    if (!order.shipments().isEmpty()) {
      return order.shipments();
    }

    LocalDateTime now = LocalDateTime.now();
    List<OrderShipmentEntity> created = new ArrayList<>();
    int sort = 0;
    if (!order.items().isEmpty()) {
      created.add(createPendingShipment(order.order().getId(), "VEGETABLE", "蔬菜包裹", sort++, now));
    }

    Map<String, String> benefitGroups = new LinkedHashMap<>();
    for (OrderBenefitItemEntity benefit : order.benefits()) {
      benefitGroups.putIfAbsent(benefit.getKind(), benefit.getNameSnapshot() + "包裹");
    }
    for (Map.Entry<String, String> entry : benefitGroups.entrySet()) {
      created.add(createPendingShipment(order.order().getId(), entry.getKey(), entry.getValue(), sort++, now));
    }

    return created;
  }

  private OrderShipmentEntity createPendingShipment(
    String orderId,
    String packageType,
    String packageName,
    int sortOrder,
    LocalDateTime now
  ) {
    OrderShipmentEntity shipment = new OrderShipmentEntity();
    shipment.setId(id());
    shipment.setOrderId(orderId);
    shipment.setPackageType(packageType);
    shipment.setPackageName(packageName);
    shipment.setStatus("PENDING");
    shipment.setSortOrder(sortOrder);
    shipment.setCreatedAt(now);
    shipment.setUpdatedAt(now);
    orderShipmentMapper.insert(shipment);
    return shipment;
  }

  private List<String> packageContentForShipment(OrderShipmentEntity shipment, OrderView order) {
    List<String> vegetableItems = order.items()
      .stream()
      .map(item -> item.getDishNameSnapshot() + " " + formatNumber(item.getWeightJin()) + "斤")
      .toList();
    List<String> matchedBenefits = order.benefits()
      .stream()
      .filter(benefit ->
        Objects.equals(benefit.getKind(), shipment.getPackageType()) ||
        shipment.getPackageName().contains(benefit.getNameSnapshot())
      )
      .map(benefit ->
        benefit.getNameSnapshot() + " " + formatNumber(benefit.getQuantity()) + benefit.getUnitSnapshot()
      )
      .toList();

    if ("VEGETABLE".equals(shipment.getPackageType())) {
      return vegetableItems;
    }
    if (!matchedBenefits.isEmpty()) {
      return matchedBenefits;
    }
    List<String> fallback = new ArrayList<>(vegetableItems);
    fallback.addAll(matchedBenefits);
    return fallback;
  }

  private List<NormalizedShipment> normalizeShipments(AdminOrderShipRequest input) {
    List<AdminOrderShipmentInput> source =
      input.shipments() != null && !input.shipments().isEmpty()
        ? input.shipments()
        : List.of(new AdminOrderShipmentInput(input.logisticsNo(), "蔬菜包裹", "VEGETABLE"));

    List<NormalizedShipment> shipments = new ArrayList<>();
    for (int index = 0; index < source.size(); index++) {
      AdminOrderShipmentInput shipment = source.get(index);
      String logisticsNo = shipment.logisticsNo() == null ? "" : shipment.logisticsNo().trim();
      String packageName = shipment.packageName() == null || shipment.packageName().isBlank()
        ? "包裹" + (index + 1)
        : shipment.packageName().trim();
      String packageType = shipment.packageType() == null || shipment.packageType().isBlank()
        ? "EXTRA"
        : shipment.packageType().trim();

      if (!StringUtils.hasText(logisticsNo)) {
        throw new ApiException("LOGISTICS_NO_REQUIRED", "请输入运单号", HttpStatus.BAD_REQUEST);
      }
      shipments.add(new NormalizedShipment(logisticsNo, packageName, packageType, index));
    }

    return shipments;
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private OrderView loadOrderView(String orderId, String storeId) {
    OrderEntity order = orderMapper.selectOne(
      new LambdaQueryWrapper<OrderEntity>()
        .eq(OrderEntity::getId, orderId)
        .eq(OrderEntity::getStoreId, storeId)
        .isNull(OrderEntity::getDeletedByUserAt)
    );
    if (order == null) {
      throw new ApiException("ORDER_NOT_FOUND", "订单不存在", HttpStatus.NOT_FOUND);
    }

    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }

    UserEntity user = userMapper.selectById(order.getUserId());
    if (user == null) {
      throw new ApiException("USER_NOT_FOUND", "会员不存在", HttpStatus.NOT_FOUND);
    }

    UserPackageEntity userPackage = userPackageMapper.selectById(order.getUserPackageId());
    if (userPackage == null) {
      throw new ApiException("USER_PACKAGE_NOT_FOUND", "用户套餐不存在", HttpStatus.NOT_FOUND);
    }

    return new OrderView(
      order,
      store,
      user,
      userPackage,
      orderItemMapper.selectList(
        new LambdaQueryWrapper<OrderItemEntity>()
          .eq(OrderItemEntity::getOrderId, order.getId())
          .orderByAsc(OrderItemEntity::getId)
      ),
      orderBenefitItemMapper.selectList(
        new LambdaQueryWrapper<OrderBenefitItemEntity>()
          .eq(OrderBenefitItemEntity::getOrderId, order.getId())
          .orderByAsc(OrderBenefitItemEntity::getId)
      ),
      loadShipments(order.getId())
    );
  }

  private List<OrderView> loadOrderViews(String storeId, List<String> rawOrderIds, boolean ascending) {
    List<String> orderIds = rawOrderIds
      .stream()
      .filter(StringUtils::hasText)
      .map(String::trim)
      .distinct()
      .toList();
    if (orderIds.isEmpty()) {
      throw new ApiException("PRINT_ORDERS_REQUIRED", "请选择要打印的订单", HttpStatus.BAD_REQUEST);
    }

    List<OrderView> views = orderIds.stream().map(orderId -> loadOrderView(orderId, storeId)).toList();
    Comparator<OrderView> comparator = Comparator.comparing(view -> view.order().getCreatedAt());
    return views.stream().sorted(ascending ? comparator : comparator.reversed()).toList();
  }

  private List<OrderShipmentEntity> loadShipments(String orderId) {
    return orderShipmentMapper.selectList(
      new LambdaQueryWrapper<OrderShipmentEntity>()
        .eq(OrderShipmentEntity::getOrderId, orderId)
        .orderByAsc(OrderShipmentEntity::getSortOrder)
    );
  }

  private List<String> findExportOrderIds(
    String storeId,
    String status,
    String query,
    String dateFrom,
    String dateTo
  ) {
    MPJLambdaWrapper<OrderEntity> wrapper = new MPJLambdaWrapper<OrderEntity>()
      .selectAs(OrderEntity::getId, OrderListItem::getId)
      .leftJoin(UserEntity.class, UserEntity::getId, OrderEntity::getUserId)
      .eq(OrderEntity::getStoreId, storeId)
      .isNull(OrderEntity::getDeletedByUserAt)
      .orderByDesc(OrderEntity::getCreatedAt)
      .last("LIMIT 1000");

    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      wrapper.apply("t.\"status\" = {0}::\"OrderStatus\"", status.trim());
    }

    if (StringUtils.hasText(query)) {
      String keyword = query.trim();
      wrapper.and(w -> w
        .like(OrderEntity::getOrderNo, keyword)
        .or()
        .like(UserEntity::getNickname, keyword)
        .or()
        .like(UserEntity::getPhone, keyword)
      );
    }

    LocalDate from = parseDate(dateFrom, "dateFrom");
    if (from != null) {
      wrapper.ge(OrderEntity::getCreatedAt, from.atStartOfDay());
    }
    LocalDate to = parseDate(dateTo, "dateTo");
    if (to != null) {
      wrapper.lt(OrderEntity::getCreatedAt, to.plusDays(1).atStartOfDay());
    }

    return orderMapper
      .selectJoinList(OrderListItem.class, wrapper)
      .stream()
      .map(OrderListItem::getId)
      .toList();
  }

  private LocalDate parseDate(String value, String field) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return LocalDate.parse(value.trim());
    } catch (RuntimeException exception) {
      throw new ApiException("INVALID_PARAMS", field + " 日期格式不正确", HttpStatus.BAD_REQUEST);
    }
  }

  private ApiException normalizeAdminCreateError(ApiException exception) {
    String code = exception.getCode();
    if (code.endsWith("_NOT_FOUND")) {
      return new ApiException(code, exception.getMessage(), HttpStatus.NOT_FOUND);
    }
    if (
      "BENEFIT_QUANTITY_EXCEEDED".equals(code) ||
      "DISH_STOCK_NOT_ENOUGH".equals(code) ||
      "ORDER_ALREADY_EXISTS".equals(code) ||
      "PACKAGE_UNAVAILABLE".equals(code) ||
      "PACKAGE_USED_UP".equals(code) ||
      "WEIGHT_LIMIT_EXCEEDED".equals(code)
    ) {
      return new ApiException(code, exception.getMessage(), HttpStatus.CONFLICT);
    }
    return exception;
  }

  private List<AdminOrderBatchShipmentInput> dedupeBatchShipments(
    List<AdminOrderBatchShipmentInput> rawShipments
  ) {
    if (rawShipments == null) {
      return List.of();
    }
    Map<String, AdminOrderBatchShipmentInput> shipmentsByOrder = new LinkedHashMap<>();
    for (AdminOrderBatchShipmentInput shipment : rawShipments) {
      String orderId = shipment.orderId() == null ? "" : shipment.orderId().trim();
      String logisticsNo = shipment.logisticsNo() == null ? "" : shipment.logisticsNo().trim();
      if (!StringUtils.hasText(orderId) || !StringUtils.hasText(logisticsNo)) {
        continue;
      }
      shipmentsByOrder.putIfAbsent(
        orderId,
        new AdminOrderBatchShipmentInput(logisticsNo, orderId)
      );
    }
    return List.copyOf(shipmentsByOrder.values());
  }

  private Map<String, String> parseAddress(String json) {
    if (!StringUtils.hasText(json)) {
      return Map.of();
    }
    try {
      Map<String, Object> source = objectMapper.readValue(json, new TypeReference<>() {});
      Map<String, String> target = new LinkedHashMap<>();
      for (Map.Entry<String, Object> entry : source.entrySet()) {
        target.put(entry.getKey(), entry.getValue() == null ? "" : String.valueOf(entry.getValue()));
      }
      return target;
    } catch (JsonProcessingException exception) {
      return Map.of();
    }
  }

  private String shipmentAddressText(Map<String, String> snapshot) {
    return List
      .of(
        nullToBlank(snapshot.get("province")),
        nullToBlank(snapshot.get("city")),
        nullToBlank(snapshot.get("district")),
        nullToBlank(snapshot.get("detail"))
      )
      .stream()
      .filter(StringUtils::hasText)
      .reduce((left, right) -> left + " " + right)
      .orElse(nullToBlank(snapshot.get("detail")));
  }

  private String logisticsText(OrderView order) {
    String shipmentNos = order.shipments()
      .stream()
      .map(OrderShipmentEntity::getLogisticsNo)
      .filter(StringUtils::hasText)
      .reduce((left, right) -> left + " / " + right)
      .orElse("");
    return StringUtils.hasText(shipmentNos) ? shipmentNos : nullToBlank(order.order().getLogisticsNo());
  }

  private String toCsvRow(OrderView order) {
    String dishText = order.items()
      .stream()
      .map(item -> item.getDishNameSnapshot() + " " + formatNumber(item.getWeightJin()) + "斤")
      .reduce((left, right) -> left + " / " + right)
      .orElse("");
    String benefitText = order.benefits()
      .stream()
      .map(benefit ->
        benefit.getNameSnapshot() +
        " " +
        formatNumber(benefit.getQuantity()) +
        nullToBlank(benefit.getUnitSnapshot())
      )
      .reduce((left, right) -> left + " / " + right)
      .orElse("");
    return String.join(
      ",",
      csvCell(order.order().getOrderNo()),
      csvCell(statusLabel(order.order().getStatus())),
      csvCell(StringUtils.hasText(order.user().getNickname()) ? order.user().getNickname() : "未命名会员"),
      csvCell(order.user().getPhone()),
      csvCell(order.userPackage().getNameSnapshot()),
      formatNumber(order.order().getTotalWeightJin()),
      csvCell(List.of(dishText, benefitText).stream().filter(StringUtils::hasText).reduce((left, right) -> left + " / " + right).orElse("")),
      csvCell(shipmentAddressText(parseAddress(order.order().getAddressSnapshot()))),
      csvCell(logisticsText(order)),
      csvCell(order.order().getUserVisibleRemark()),
      csvCell(order.order().getInternalRemark()),
      csvCell(order.order().getCreatedAt() == null ? "" : order.order().getCreatedAt().toString())
    );
  }

  private String statusLabel(String status) {
    return switch (nullToBlank(status)) {
      case "PENDING_SHIPMENT" -> "待配送";
      case "SHIPPED" -> "已发货";
      case "SIGNED" -> "已签收";
      case "CANCELED" -> "已取消";
      case "VOIDED" -> "已作废";
      default -> nullToBlank(status);
    };
  }

  private String csvCell(String value) {
    String text = nullToBlank(value);
    if (text.contains(",") || text.contains("\"") || text.contains("\n")) {
      return "\"" + text.replace("\"", "\"\"") + "\"";
    }
    return text;
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String resource,
    String resourceId,
    String action,
    Object beforeValue,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource(resource);
    log.setResourceId(resourceId);
    log.setAction(action);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams("{}");
    log.setResponseData("{}");
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private List<Map<String, Object>> shipmentLogValue(List<OrderShipmentEntity> shipments) {
    return shipments
      .stream()
      .map(shipment -> {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("logisticsNo", shipment.getLogisticsNo());
        value.put("packageName", shipment.getPackageName());
        value.put("packageType", shipment.getPackageType());
        value.put("status", shipment.getStatus());
        return value;
      })
      .toList();
  }

  private AdminOrderShipmentDto toShipmentDto(OrderShipmentEntity shipment) {
    return new AdminOrderShipmentDto(
      shipment.getId(),
      shipment.getLogisticsNo(),
      shipment.getPackageName(),
      shipment.getPackageType(),
      shipment.getShippedAt(),
      shipment.getStatus()
    );
  }

  private AdminOrderDetailDto toDetailDto(OrderView view) {
    return new AdminOrderDetailDto(
      parseAddress(view.order().getAddressSnapshot()),
      view.benefits().stream().map(this::toBenefitDto).toList(),
      view.order().getCanceledAt(),
      view.order().getCancelReason(),
      view.order().getCreatedAt(),
      view.order().getId(),
      view.order().getInternalRemark(),
      view.items().stream().map(this::toItemDto).toList(),
      view.order().getLogisticsNo(),
      view.order().getModifiedAt(),
      view.order().getOrderNo(),
      view.order().getShippedAt(),
      view.shipments().stream().map(this::toShipmentDto).toList(),
      view.order().getSignedAt(),
      view.order().getStatus(),
      toStoreDto(view.store()),
      view.order().getTotalWeightJin(),
      view.order().getUpdatedAt(),
      toUserDto(view.user()),
      view.order().getUserVisibleRemark(),
      toUserPackageDto(view.userPackage())
    );
  }

  private AdminOrderBenefitItemDto toBenefitDto(OrderBenefitItemEntity benefit) {
    return new AdminOrderBenefitItemDto(
      benefit.getId(),
      benefit.getKind(),
      benefit.getNameSnapshot(),
      benefit.getQuantity(),
      benefit.getUnitSnapshot()
    );
  }

  private AdminOrderItemDto toItemDto(OrderItemEntity item) {
    return new AdminOrderItemDto(
      item.getDishId(),
      item.getDishNameSnapshot(),
      item.getId(),
      item.getWeightJin()
    );
  }

  private AdminOrderStoreDto toStoreDto(StoreEntity store) {
    return new AdminOrderStoreDto(
      store.getAddress(),
      store.getCity(),
      store.getCode(),
      store.getContactName(),
      store.getContactPhone(),
      store.getDistrict(),
      store.getId(),
      store.getName(),
      store.getProvince()
    );
  }

  private AdminOrderUserDto toUserDto(UserEntity user) {
    return new AdminOrderUserDto(
      user.getId(),
      user.getNickname(),
      user.getPhone(),
      user.getStatus()
    );
  }

  private AdminOrderUserPackageDto toUserPackageDto(UserPackageEntity userPackage) {
    return new AdminOrderUserPackageDto(userPackage.getId(), userPackage.getNameSnapshot());
  }

  private List<Map<String, Object>> benefitLogValue(List<OrderBenefitItemEntity> benefits) {
    return benefits
      .stream()
      .map(benefit -> {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("kind", benefit.getKind());
        value.put("nameSnapshot", benefit.getNameSnapshot());
        value.put("quantity", zeroIfNull(benefit.getQuantity()));
        value.put("unitSnapshot", benefit.getUnitSnapshot());
        value.put("userPackageBenefitId", benefit.getUserPackageBenefitId());
        return value;
      })
      .toList();
  }

  private List<Map<String, Object>> itemLogValue(List<OrderItemEntity> items) {
    return items
      .stream()
      .map(item -> {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("dishId", item.getDishId());
        value.put("dishNameSnapshot", item.getDishNameSnapshot());
        value.put("weightJin", zeroIfNull(item.getWeightJin()));
        return value;
      })
      .toList();
  }

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value == null ? Map.of() : value);
    } catch (JsonProcessingException exception) {
      return "{}";
    }
  }

  private String maxWeightKg(BigDecimal jin) {
    BigDecimal kg = jin == null ? BigDecimal.ZERO : jin.multiply(new BigDecimal("0.5"));
    if (kg.compareTo(new BigDecimal("0.1")) < 0) {
      kg = new BigDecimal("0.1");
    }
    return kg.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
  }

  private String formatNumber(BigDecimal value) {
    if (value == null) {
      return "0";
    }
    return value.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
  }

  private String escapeHtml(String value) {
    return nullToBlank(value)
      .replace("&", "&amp;")
      .replace("<", "&lt;")
      .replace(">", "&gt;")
      .replace("\"", "&quot;")
      .replace("'", "&#39;");
  }

  private String firstText(String first, String second) {
    return StringUtils.hasText(first) ? first : second;
  }

  private String nullToBlank(String value) {
    return value == null ? "" : value;
  }

  private String normalizeNullableText(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private BigDecimal zeroIfNull(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private record NormalizedShipment(
    String logisticsNo,
    String packageName,
    String packageType,
    int sortOrder
  ) {}

  private record OrderView(
    OrderEntity order,
    StoreEntity store,
    UserEntity user,
    UserPackageEntity userPackage,
    List<OrderItemEntity> items,
    List<OrderBenefitItemEntity> benefits,
    List<OrderShipmentEntity> shipments
  ) {}
}
