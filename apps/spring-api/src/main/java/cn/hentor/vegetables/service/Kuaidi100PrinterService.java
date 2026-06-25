package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.Kuaidi100Properties;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.Kuaidi100PrintConfig;
import cn.hentor.vegetables.dto.Kuaidi100PrinterItemDto;
import cn.hentor.vegetables.dto.Kuaidi100PrinterListResponse;
import cn.hentor.vegetables.dto.Kuaidi100PrinterRequest;
import cn.hentor.vegetables.dto.Kuaidi100PrinterResponse;
import cn.hentor.vegetables.dto.Kuaidi100PrinterSummaryDto;
import cn.hentor.vegetables.dto.PaginationDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.Kuaidi100PrinterEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.Kuaidi100PrinterMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class Kuaidi100PrinterService {
  private static final Set<String> STATUSES = Set.of("ACTIVE", "DISABLED");
  private static final TypeReference<Map<String, Object>> REQUEST_PARAMS_TYPE =
    new TypeReference<>() {};

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final Kuaidi100PrinterMapper printerMapper;
  private final Kuaidi100Properties properties;
  private final ObjectMapper objectMapper;
  private final StoreMapper storeMapper;

  public Kuaidi100PrinterService(
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    Kuaidi100PrinterMapper printerMapper,
    Kuaidi100Properties properties,
    ObjectMapper objectMapper,
    StoreMapper storeMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.printerMapper = printerMapper;
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.storeMapper = storeMapper;
  }

  public Kuaidi100PrinterListResponse list(
    String storeId,
    String status,
    String query,
    long page,
    long pageSize
  ) {
    requireStore(storeId);
    validateOptionalStatus(status);
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);
    Page<Kuaidi100PrinterEntity> result = printerMapper.selectPage(
      new Page<>(normalizedPage, normalizedPageSize),
      buildListWrapper(storeId, status, query)
        .orderByDesc(Kuaidi100PrinterEntity::getDefaultPrinter)
        .orderByAsc(Kuaidi100PrinterEntity::getSortOrder)
        .orderByDesc(Kuaidi100PrinterEntity::getCreatedAt)
    );
    long totalPages =
      result.getSize() == 0 ? 0 : (long) Math.ceil((double) result.getTotal() / result.getSize());
    return new Kuaidi100PrinterListResponse(
      result.getRecords().stream().map(this::toDto).toList(),
      new PaginationDto(result.getCurrent(), result.getSize(), result.getTotal(), totalPages),
      summary(storeId)
    );
  }

  public Kuaidi100PrinterResponse get(String storeId, String printerId) {
    return new Kuaidi100PrinterResponse(toDto(requirePrinter(storeId, printerId)));
  }

  @Transactional
  public Kuaidi100PrinterResponse create(Kuaidi100PrinterRequest request, AdminSessionDto session) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    requireStore(request.storeId());
    NormalizedPrinterInput input = normalize(request);
    LocalDateTime now = LocalDateTime.now();
    if (input.defaultPrinter()) {
      printerMapper.clearDefaultPrinters(request.storeId(), now);
    }

    Kuaidi100PrinterEntity printer = new Kuaidi100PrinterEntity();
    printer.setId(id());
    printer.setStoreId(request.storeId());
    applyInput(printer, input);
    printer.setCreatedAt(now);
    printer.setUpdatedAt(now);
    printerMapper.insertPrinter(printer);

    writeOperationLog(
      operator.getId(),
      request.storeId(),
      printer.getId(),
      "KUAIDI100_PRINTER_CREATED",
      null,
      printerLogValue(printer)
    );
    return new Kuaidi100PrinterResponse(toDto(requirePrinter(request.storeId(), printer.getId())));
  }

  @Transactional
  public Kuaidi100PrinterResponse update(
    String printerId,
    Kuaidi100PrinterRequest request,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    Kuaidi100PrinterEntity existing = requirePrinter(request.storeId(), printerId);
    NormalizedPrinterInput input = normalize(request);
    LocalDateTime now = LocalDateTime.now();
    if (input.defaultPrinter()) {
      printerMapper.clearDefaultPrinters(request.storeId(), now);
    }

    Kuaidi100PrinterEntity update = new Kuaidi100PrinterEntity();
    update.setId(existing.getId());
    update.setStoreId(existing.getStoreId());
    applyInput(update, input);
    update.setUpdatedAt(now);
    printerMapper.updatePrinter(update);

    Kuaidi100PrinterEntity updated = requirePrinter(request.storeId(), existing.getId());
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      existing.getId(),
      "KUAIDI100_PRINTER_UPDATED",
      printerLogValue(existing),
      printerLogValue(updated)
    );
    return new Kuaidi100PrinterResponse(toDto(updated));
  }

  @Transactional
  public Kuaidi100PrinterListResponse delete(
    String storeId,
    String printerId,
    AdminSessionDto session
  ) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    Kuaidi100PrinterEntity existing = requirePrinter(storeId, printerId);
    printerMapper.deleteById(existing.getId());
    writeOperationLog(
      operator.getId(),
      storeId,
      existing.getId(),
      "KUAIDI100_PRINTER_DELETED",
      printerLogValue(existing),
      null
    );
    return list(storeId, null, null, 1, 20);
  }

  public Kuaidi100PrintConfig resolvePrintConfig(String storeId, String printerId) {
    Kuaidi100PrinterEntity printer = null;
    if (StringUtils.hasText(printerId)) {
      printer = requirePrinter(storeId, printerId);
      if (!"ACTIVE".equals(printer.getStatus())) {
        throw new ApiException("PRINTER_DISABLED", "所选打印机已停用", HttpStatus.BAD_REQUEST);
      }
    } else if (StringUtils.hasText(storeId)) {
      printer = printerMapper.selectOne(
        new LambdaQueryWrapper<Kuaidi100PrinterEntity>()
          .eq(Kuaidi100PrinterEntity::getStoreId, storeId)
          .eq(Kuaidi100PrinterEntity::getStatus, "ACTIVE")
          .eq(Kuaidi100PrinterEntity::getDefaultPrinter, true)
          .orderByAsc(Kuaidi100PrinterEntity::getSortOrder)
          .last("limit 1")
      );
      if (printer == null) {
        printer = printerMapper.selectOne(
          new LambdaQueryWrapper<Kuaidi100PrinterEntity>()
            .eq(Kuaidi100PrinterEntity::getStoreId, storeId)
            .eq(Kuaidi100PrinterEntity::getStatus, "ACTIVE")
            .orderByAsc(Kuaidi100PrinterEntity::getSortOrder)
            .orderByDesc(Kuaidi100PrinterEntity::getCreatedAt)
            .last("limit 1")
        );
      }
    }

    return toPrintConfig(printer);
  }

  private LambdaQueryWrapper<Kuaidi100PrinterEntity> buildListWrapper(
    String storeId,
    String status,
    String query
  ) {
    LambdaQueryWrapper<Kuaidi100PrinterEntity> wrapper =
      new LambdaQueryWrapper<Kuaidi100PrinterEntity>()
        .eq(Kuaidi100PrinterEntity::getStoreId, storeId);
    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      wrapper.eq(Kuaidi100PrinterEntity::getStatus, status.trim());
    }
    if (StringUtils.hasText(query)) {
      String keyword = query.trim();
      wrapper.and(w -> w
        .like(Kuaidi100PrinterEntity::getName, keyword)
        .or()
        .like(Kuaidi100PrinterEntity::getSiid, keyword)
        .or()
        .like(Kuaidi100PrinterEntity::getKuaidicom, keyword)
      );
    }
    return wrapper;
  }

  private Kuaidi100PrinterSummaryDto summary(String storeId) {
    return new Kuaidi100PrinterSummaryDto(
      count(storeId, "ACTIVE", null),
      count(storeId, "DISABLED", null),
      count(storeId, "ACTIVE", true),
      count(storeId, null, null)
    );
  }

  private long count(String storeId, String status, Boolean defaultPrinter) {
    LambdaQueryWrapper<Kuaidi100PrinterEntity> wrapper =
      new LambdaQueryWrapper<Kuaidi100PrinterEntity>()
        .eq(Kuaidi100PrinterEntity::getStoreId, storeId);
    if (StringUtils.hasText(status)) {
      wrapper.eq(Kuaidi100PrinterEntity::getStatus, status);
    }
    if (defaultPrinter != null) {
      wrapper.eq(Kuaidi100PrinterEntity::getDefaultPrinter, defaultPrinter);
    }
    Long count = printerMapper.selectCount(wrapper);
    return count == null ? 0 : count;
  }

  private NormalizedPrinterInput normalize(Kuaidi100PrinterRequest request) {
    String status = StringUtils.hasText(request.status()) ? request.status().trim() : "ACTIVE";
    validateStatus(status);
    String name = requireText(request.name(), "PRINTER_NAME_REQUIRED", "请输入打印机名称");
    String siid = requireText(request.siid(), "PRINTER_SIID_REQUIRED", "请输入打印机 siid");
    return new NormalizedPrinterInput(
      nullableText(request.apiKey()),
      nullableText(request.apiSecret()),
      nullableText(request.code()),
      nullableText(request.expType()),
      Boolean.TRUE.equals(request.isDefault()),
      nullableText(request.kuaidicom()),
      name,
      nullableText(request.partnerId()),
      nullableText(request.partnerKey()),
      nullableText(request.payType()),
      nullableText(request.remark()),
      request.requestParams() == null ? Map.of() : new LinkedHashMap<>(request.requestParams()),
      nullableText(request.senderCompany()),
      siid,
      request.sortOrder() == null ? 0 : request.sortOrder(),
      status,
      nullableText(request.tempId())
    );
  }

  private void applyInput(Kuaidi100PrinterEntity printer, NormalizedPrinterInput input) {
    printer.setApiKey(input.apiKey());
    printer.setApiSecret(input.apiSecret());
    printer.setCode(input.code());
    printer.setDefaultPrinter(input.defaultPrinter());
    printer.setExpType(input.expType());
    printer.setKuaidicom(input.kuaidicom());
    printer.setName(input.name());
    printer.setPartnerId(input.partnerId());
    printer.setPartnerKey(input.partnerKey());
    printer.setPayType(input.payType());
    printer.setRemark(input.remark());
    printer.setRequestParams(toJson(input.requestParams()));
    printer.setSenderCompany(input.senderCompany());
    printer.setSiid(input.siid());
    printer.setSortOrder(input.sortOrder());
    printer.setStatus(input.status());
    printer.setTempId(input.tempId());
  }

  private Kuaidi100PrintConfig toPrintConfig(Kuaidi100PrinterEntity printer) {
    return new Kuaidi100PrintConfig(
      properties.getBackTempId(),
      properties.getChildTempId(),
      firstText(printer == null ? null : printer.getCode(), properties.getCode()),
      firstText(printer == null ? null : printer.getExpType(), properties.getExpType()),
      firstText(printer == null ? null : printer.getApiKey(), properties.getKey()),
      firstText(printer == null ? null : printer.getKuaidicom(), properties.getKuaidicom()),
      properties.getNeedBack(),
      properties.getNeedChild(),
      properties.isNeedDesensitization(),
      properties.isNeedLogo(),
      properties.isNeedOcr(),
      firstText(printer == null ? null : printer.getPartnerId(), properties.getPartnerId()),
      firstText(printer == null ? null : printer.getPartnerKey(), properties.getPartnerKey()),
      firstText(printer == null ? null : printer.getPayType(), properties.getPayType()),
      printer == null ? null : printer.getId(),
      printer == null ? "环境变量默认打印机" : printer.getName(),
      printer == null ? Map.of() : parseRequestParams(printer.getRequestParams()),
      firstText(printer == null ? null : printer.getApiSecret(), properties.getSecret()),
      firstText(printer == null ? null : printer.getSenderCompany(), properties.getSenderCompany()),
      firstText(printer == null ? null : printer.getSiid(), properties.getSiid()),
      firstText(printer == null ? null : printer.getTempId(), properties.getTempId())
    );
  }

  private Kuaidi100PrinterItemDto toDto(Kuaidi100PrinterEntity printer) {
    return new Kuaidi100PrinterItemDto(
      printer.getApiKey(),
      printer.getApiSecret(),
      printer.getCode(),
      printer.getCreatedAt(),
      printer.getExpType(),
      printer.getId(),
      Boolean.TRUE.equals(printer.getDefaultPrinter()),
      printer.getKuaidicom(),
      printer.getName(),
      printer.getPartnerId(),
      printer.getPartnerKey(),
      printer.getPayType(),
      printer.getRemark(),
      parseRequestParams(printer.getRequestParams()),
      printer.getSenderCompany(),
      printer.getSiid(),
      printer.getSortOrder() == null ? 0 : printer.getSortOrder(),
      printer.getStatus(),
      printer.getStoreId(),
      printer.getTempId(),
      printer.getUpdatedAt()
    );
  }

  private Kuaidi100PrinterEntity requirePrinter(String storeId, String printerId) {
    Kuaidi100PrinterEntity printer = printerMapper.selectOne(
      new LambdaQueryWrapper<Kuaidi100PrinterEntity>()
        .eq(Kuaidi100PrinterEntity::getId, printerId)
        .eq(Kuaidi100PrinterEntity::getStoreId, storeId)
        .last("limit 1")
    );
    if (printer == null) {
      throw new ApiException("PRINTER_NOT_FOUND", "打印机不存在", HttpStatus.NOT_FOUND);
    }
    return printer;
  }

  private StoreEntity requireStore(String storeId) {
    StoreEntity store = storeMapper.selectById(storeId);
    if (store == null) {
      throw new ApiException("STORE_NOT_FOUND", "门店不存在", HttpStatus.NOT_FOUND);
    }
    return store;
  }

  private AdminUserEntity requireActiveOperator(String operatorId) {
    AdminUserEntity operator = adminUserMapper.selectById(operatorId);
    if (operator == null || !"ACTIVE".equals(operator.getStatus())) {
      throw new ApiException("OPERATOR_NOT_FOUND", "操作员不存在", HttpStatus.BAD_REQUEST);
    }
    return operator;
  }

  private void validateOptionalStatus(String status) {
    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      validateStatus(status.trim());
    }
  }

  private void validateStatus(String status) {
    if (!STATUSES.contains(status)) {
      throw new ApiException("PRINTER_STATUS_INVALID", "打印机状态不正确", HttpStatus.BAD_REQUEST);
    }
  }

  private String requireText(String value, String code, String message) {
    String text = nullableText(value);
    if (!StringUtils.hasText(text)) {
      throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
    }
    return text;
  }

  private String nullableText(String value) {
    String trimmed = value == null ? "" : value.trim();
    return StringUtils.hasText(trimmed) ? trimmed : null;
  }

  private String firstText(String value, String fallback) {
    return StringUtils.hasText(value) ? value : (fallback == null ? "" : fallback);
  }

  private Map<String, Object> parseRequestParams(String value) {
    if (!StringUtils.hasText(value)) {
      return Collections.emptyMap();
    }
    try {
      return objectMapper.readValue(value, REQUEST_PARAMS_TYPE);
    } catch (JsonProcessingException exception) {
      return Collections.emptyMap();
    }
  }

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value == null ? Map.of() : value);
    } catch (JsonProcessingException exception) {
      return "{}";
    }
  }

  private Map<String, Object> printerLogValue(Kuaidi100PrinterEntity printer) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("id", printer.getId());
    value.put("name", printer.getName());
    value.put("status", printer.getStatus());
    value.put("isDefault", printer.getDefaultPrinter());
    value.put("kuaidicom", printer.getKuaidicom());
    value.put("siid", printer.getSiid());
    value.put("tempId", printer.getTempId());
    value.put("sortOrder", printer.getSortOrder());
    return value;
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String printerId,
    String action,
    Object beforeValue,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource("kuaidi100_printer");
    log.setResourceId(printerId);
    log.setAction(action);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams("{}");
    log.setResponseData("{}");
    log.setStatusCode(200);
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private record NormalizedPrinterInput(
    String apiKey,
    String apiSecret,
    String code,
    String expType,
    boolean defaultPrinter,
    String kuaidicom,
    String name,
    String partnerId,
    String partnerKey,
    String payType,
    String remark,
    Map<String, Object> requestParams,
    String senderCompany,
    String siid,
    int sortOrder,
    String status,
    String tempId
  ) {}
}
