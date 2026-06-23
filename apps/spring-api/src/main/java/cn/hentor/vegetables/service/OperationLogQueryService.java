package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.PageResult;
import cn.hentor.vegetables.dto.OperationLogActorDto;
import cn.hentor.vegetables.dto.OperationLogItemDto;
import cn.hentor.vegetables.dto.OperationLogListItem;
import cn.hentor.vegetables.dto.OperationLogStoreDto;
import cn.hentor.vegetables.dto.OperationLogUserDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.yulichang.wrapper.MPJLambdaWrapper;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class OperationLogQueryService {
  private final AdminOperationLogMapper adminOperationLogMapper;
  private final ObjectMapper objectMapper;

  public OperationLogQueryService(
    AdminOperationLogMapper adminOperationLogMapper,
    ObjectMapper objectMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.objectMapper = objectMapper;
  }

  public PageResult<OperationLogItemDto> listOperationLogs(
    String action,
    LocalDateTime dateFrom,
    LocalDateTime dateTo,
    String operatorId,
    long page,
    long pageSize,
    String query,
    String resource,
    Integer statusCode,
    String storeId
  ) {
    long normalizedPage = Math.max(page, 1);
    long normalizedPageSize = Math.min(Math.max(pageSize, 1), 200);
    MPJLambdaWrapper<AdminOperationLogEntity> wrapper =
      new MPJLambdaWrapper<AdminOperationLogEntity>()
        .selectAs(AdminOperationLogEntity::getAction, OperationLogListItem::getAction)
        .selectAs(AdminOperationLogEntity::getAfterValue, OperationLogListItem::getAfterValue)
        .selectAs(AdminOperationLogEntity::getBeforeValue, OperationLogListItem::getBeforeValue)
        .selectAs(AdminOperationLogEntity::getCreatedAt, OperationLogListItem::getCreatedAt)
        .selectAs(AdminOperationLogEntity::getDurationMs, OperationLogListItem::getDurationMs)
        .selectAs(AdminOperationLogEntity::getId, OperationLogListItem::getId)
        .selectAs(AdminOperationLogEntity::getIp, OperationLogListItem::getIp)
        .selectAs(AdminOperationLogEntity::getRequestMethod, OperationLogListItem::getRequestMethod)
        .selectAs(AdminOperationLogEntity::getRequestParams, OperationLogListItem::getRequestParams)
        .selectAs(AdminOperationLogEntity::getRequestPath, OperationLogListItem::getRequestPath)
        .selectAs(AdminOperationLogEntity::getResource, OperationLogListItem::getResource)
        .selectAs(AdminOperationLogEntity::getResourceId, OperationLogListItem::getResourceId)
        .selectAs(AdminOperationLogEntity::getResponseData, OperationLogListItem::getResponseData)
        .selectAs(AdminOperationLogEntity::getStatusCode, OperationLogListItem::getStatusCode)
        .selectAs(AdminOperationLogEntity::getUserAgent, OperationLogListItem::getUserAgent)
        .selectAs(AdminUserEntity::getId, OperationLogListItem::getOperatorActorId)
        .selectAs(AdminUserEntity::getName, OperationLogListItem::getOperatorName)
        .selectAs(AdminUserEntity::getUsername, OperationLogListItem::getOperatorUsername)
        .selectAs(UserEntity::getId, OperationLogListItem::getUserActorId)
        .selectAs(UserEntity::getNickname, OperationLogListItem::getUserNickname)
        .selectAs(UserEntity::getPhone, OperationLogListItem::getUserPhone)
        .selectAs(StoreEntity::getId, OperationLogListItem::getStoreActorId)
        .selectAs(StoreEntity::getCode, OperationLogListItem::getStoreCode)
        .selectAs(StoreEntity::getName, OperationLogListItem::getStoreName)
        .selectAs(StoreEntity::getType, OperationLogListItem::getStoreType)
        .leftJoin(AdminUserEntity.class, AdminUserEntity::getId, AdminOperationLogEntity::getOperatorId)
        .leftJoin(UserEntity.class, UserEntity::getId, AdminOperationLogEntity::getUserId)
        .leftJoin(StoreEntity.class, StoreEntity::getId, AdminOperationLogEntity::getStoreId)
        .orderByDesc(AdminOperationLogEntity::getCreatedAt);

    if (StringUtils.hasText(action)) {
      wrapper.eq(AdminOperationLogEntity::getAction, action.trim());
    }
    if (StringUtils.hasText(operatorId)) {
      wrapper.eq(AdminOperationLogEntity::getOperatorId, operatorId.trim());
    }
    if (StringUtils.hasText(resource)) {
      wrapper.eq(AdminOperationLogEntity::getResource, resource.trim());
    }
    if (statusCode != null) {
      wrapper.eq(AdminOperationLogEntity::getStatusCode, statusCode);
    }
    if (StringUtils.hasText(storeId)) {
      wrapper.eq(AdminOperationLogEntity::getStoreId, storeId.trim());
    }
    if (dateFrom != null) {
      wrapper.ge(AdminOperationLogEntity::getCreatedAt, dateFrom);
    }
    if (dateTo != null) {
      wrapper.le(AdminOperationLogEntity::getCreatedAt, dateTo);
    }
    if (StringUtils.hasText(query)) {
      String keyword = query.trim();
      wrapper.and(w -> w
        .like(AdminOperationLogEntity::getAction, keyword)
        .or()
        .like(AdminOperationLogEntity::getResource, keyword)
        .or()
        .like(AdminOperationLogEntity::getResourceId, keyword)
        .or()
        .like(AdminOperationLogEntity::getRequestPath, keyword)
        .or()
        .like(AdminOperationLogEntity::getRequestMethod, keyword)
        .or()
        .like(AdminUserEntity::getName, keyword)
        .or()
        .like(AdminUserEntity::getUsername, keyword)
        .or()
        .like(UserEntity::getNickname, keyword)
        .or()
        .like(UserEntity::getPhone, keyword)
        .or()
        .like(StoreEntity::getName, keyword)
        .or()
        .like(StoreEntity::getCode, keyword)
      );
    }

    Page<OperationLogListItem> pageResult = adminOperationLogMapper.selectJoinPage(
      new Page<>(normalizedPage, normalizedPageSize),
      OperationLogListItem.class,
      wrapper
    );
    long totalPages =
      pageResult.getSize() == 0
        ? 0
        : (long) Math.ceil((double) pageResult.getTotal() / pageResult.getSize());
    return new PageResult<>(
      pageResult.getRecords().stream().map(this::toDto).toList(),
      pageResult.getCurrent(),
      pageResult.getSize(),
      pageResult.getTotal(),
      totalPages
    );
  }

  private OperationLogItemDto toDto(OperationLogListItem item) {
    return new OperationLogItemDto(
      item.getAction(),
      parseJson(item.getAfterValue()),
      parseJson(item.getBeforeValue()),
      item.getCreatedAt(),
      item.getDurationMs(),
      item.getId(),
      item.getIp(),
      StringUtils.hasText(item.getOperatorActorId())
        ? new OperationLogActorDto(
          item.getOperatorActorId(),
          item.getOperatorName() == null ? "" : item.getOperatorName(),
          item.getOperatorUsername() == null ? "" : item.getOperatorUsername()
        )
        : null,
      item.getResource(),
      item.getResourceId(),
      item.getRequestMethod(),
      parseJson(item.getRequestParams()),
      item.getRequestPath(),
      parseJson(item.getResponseData()),
      item.getStatusCode(),
      StringUtils.hasText(item.getStoreActorId())
        ? new OperationLogStoreDto(
          item.getStoreCode() == null ? "" : item.getStoreCode(),
          item.getStoreActorId(),
          item.getStoreName() == null ? "" : item.getStoreName(),
          item.getStoreType()
        )
        : null,
      StringUtils.hasText(item.getUserActorId())
        ? new OperationLogUserDto(
          item.getUserActorId(),
          item.getUserNickname(),
          item.getUserPhone()
        )
        : null,
      item.getUserAgent()
    );
  }

  private JsonNode parseJson(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return objectMapper.readTree(value);
    } catch (JsonProcessingException exception) {
      return objectMapper.getNodeFactory().textNode(value);
    }
  }
}
