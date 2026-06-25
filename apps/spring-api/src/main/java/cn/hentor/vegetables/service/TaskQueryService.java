package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.PaginationDto;
import cn.hentor.vegetables.dto.TaskCopyRequest;
import cn.hentor.vegetables.dto.TaskDishDto;
import cn.hentor.vegetables.dto.TaskItemDto;
import cn.hentor.vegetables.dto.TaskListResponse;
import cn.hentor.vegetables.dto.TaskRequest;
import cn.hentor.vegetables.dto.TaskResponse;
import cn.hentor.vegetables.dto.TaskStoreDto;
import cn.hentor.vegetables.dto.TaskSummaryDto;
import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.DishEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.TaskDishEntity;
import cn.hentor.vegetables.entity.TaskEntity;
import cn.hentor.vegetables.mapper.AdminOperationLogMapper;
import cn.hentor.vegetables.mapper.AdminUserMapper;
import cn.hentor.vegetables.mapper.DishMapper;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.mapper.TaskDishMapper;
import cn.hentor.vegetables.mapper.TaskMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class TaskQueryService {
  private static final Set<String> TASK_STATUSES = Set.of("DRAFT", "ACTIVE", "DISABLED");
  private static final String CUTOFF_TIME_PATTERN = "^([01]\\d|2[0-3]):[0-5]\\d$";

  private final AdminOperationLogMapper adminOperationLogMapper;
  private final AdminUserMapper adminUserMapper;
  private final DishMapper dishMapper;
  private final ObjectMapper objectMapper;
  private final StoreMapper storeMapper;
  private final TaskDishMapper taskDishMapper;
  private final TaskMapper taskMapper;

  public TaskQueryService(
    AdminOperationLogMapper adminOperationLogMapper,
    AdminUserMapper adminUserMapper,
    DishMapper dishMapper,
    ObjectMapper objectMapper,
    StoreMapper storeMapper,
    TaskDishMapper taskDishMapper,
    TaskMapper taskMapper
  ) {
    this.adminOperationLogMapper = adminOperationLogMapper;
    this.adminUserMapper = adminUserMapper;
    this.dishMapper = dishMapper;
    this.objectMapper = objectMapper;
    this.storeMapper = storeMapper;
    this.taskDishMapper = taskDishMapper;
    this.taskMapper = taskMapper;
  }

  public TaskListResponse list(
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
    Page<TaskEntity> result = taskMapper.selectPage(
      new Page<>(normalizedPage, normalizedPageSize),
      buildListWrapper(storeId, status, query)
        .orderByDesc(TaskEntity::getCreatedAt)
    );
    StoreEntity store = requireStore(storeId);
    Map<String, List<TaskDishEntity>> linksByTask = loadTaskDishLinks(result.getRecords());
    Map<String, DishEntity> dishesById = loadDishesById(linksByTask);

    long totalPages =
      result.getSize() == 0 ? 0 : (long) Math.ceil((double) result.getTotal() / result.getSize());

    return new TaskListResponse(
      result
        .getRecords()
        .stream()
        .map(task -> toDto(task, store, linksByTask.getOrDefault(task.getId(), List.of()), dishesById, false))
        .toList(),
      new PaginationDto(result.getCurrent(), result.getSize(), result.getTotal(), totalPages),
      summary(storeId)
    );
  }

  public TaskResponse get(String storeId, String taskId) {
    StoreEntity store = requireStore(storeId);
    TaskEntity task = requireTask(storeId, taskId);
    List<TaskDishEntity> links = taskDishMapper.selectList(
      new LambdaQueryWrapper<TaskDishEntity>()
        .eq(TaskDishEntity::getTaskId, task.getId())
        .orderByAsc(TaskDishEntity::getSortOrder)
    );
    Map<String, DishEntity> dishesById = loadDishesByIds(
      links.stream().map(TaskDishEntity::getDishId).toList()
    );
    return new TaskResponse(toDto(task, store, links, dishesById, true));
  }

  @Transactional
  public TaskResponse create(TaskRequest request, AdminSessionDto session) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity store = requireStore(request.storeId());
    NormalizedTaskInput input = normalizeTaskInput(request);
    ensureTaskTimeRangeAvailable(request.storeId(), input.startsAt(), input.endsAt(), input.status(), null);
    ensureTaskDishes(request.storeId(), input.dishIds());

    LocalDateTime now = LocalDateTime.now();
    TaskEntity task = new TaskEntity();
    task.setId(id());
    task.setStoreId(request.storeId());
    task.setName(input.name());
    task.setStatus(input.status());
    task.setStartsAt(input.startsAt());
    task.setEndsAt(input.endsAt());
    task.setCutoffTime(input.cutoffTime());
    task.setTag(input.tag());
    task.setCreatedAt(now);
    task.setUpdatedAt(now);
    taskMapper.insertAdminTask(task);
    replaceTaskDishes(task.getId(), input.dishIds());

    writeOperationLog(
      operator.getId(),
      request.storeId(),
      task.getId(),
      "TASK_CREATED",
      null,
      taskLogValue(input)
    );

    return new TaskResponse(toDto(task, store, loadLinks(task.getId()), loadDishesByIds(input.dishIds()), true));
  }

  @Transactional
  public TaskResponse update(String taskId, TaskRequest request, AdminSessionDto session) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity store = requireStore(request.storeId());
    TaskEntity existing = requireTask(request.storeId(), taskId);
    List<TaskDishEntity> beforeLinks = loadLinks(existing.getId());

    if ("ACTIVE".equals(existing.getStatus())) {
      throw new ApiException("TASK_ALREADY_ACTIVE", "已生效任务不能再修改", HttpStatus.BAD_REQUEST);
    }

    NormalizedTaskInput input = normalizeTaskInput(request);
    ensureTaskTimeRangeAvailable(
      request.storeId(),
      input.startsAt(),
      input.endsAt(),
      input.status(),
      existing.getId()
    );
    ensureTaskDishes(request.storeId(), input.dishIds());

    TaskEntity update = new TaskEntity();
    update.setId(existing.getId());
    update.setName(input.name());
    update.setStatus(input.status());
    update.setStartsAt(input.startsAt());
    update.setEndsAt(input.endsAt());
    update.setCutoffTime(input.cutoffTime());
    update.setTag(input.tag());
    update.setUpdatedAt(LocalDateTime.now());
    taskMapper.updateAdminTask(update);
    replaceTaskDishes(existing.getId(), input.dishIds());

    TaskEntity updated = requireTask(request.storeId(), existing.getId());
    List<TaskDishEntity> afterLinks = loadLinks(updated.getId());
    writeOperationLog(
      operator.getId(),
      request.storeId(),
      existing.getId(),
      "TASK_UPDATED",
      taskLogValue(existing, beforeLinks),
      taskLogValue(updated, afterLinks)
    );

    return new TaskResponse(toDto(updated, store, afterLinks, loadDishesByIds(input.dishIds()), true));
  }

  @Transactional
  public TaskResponse copy(String sourceTaskId, TaskCopyRequest request, AdminSessionDto session) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity store = requireStore(request.storeId());
    TaskEntity source = requireTask(request.storeId(), sourceTaskId);
    NormalizedTaskInput input = normalizeTaskInput(
      new TaskRequest(
        request.cutoffTime(),
        request.dishIds(),
        request.endsAt(),
        request.name(),
        request.startsAt(),
        "DRAFT",
        request.storeId(),
        request.tag()
      )
    );
    ensureTaskTimeRangeAvailable(request.storeId(), input.startsAt(), input.endsAt(), input.status(), null);
    ensureTaskDishes(request.storeId(), input.dishIds());

    LocalDateTime now = LocalDateTime.now();
    TaskEntity copied = new TaskEntity();
    copied.setId(id());
    copied.setStoreId(request.storeId());
    copied.setName(input.name());
    copied.setStatus("DRAFT");
    copied.setStartsAt(input.startsAt());
    copied.setEndsAt(input.endsAt());
    copied.setCutoffTime(input.cutoffTime());
    copied.setTag(input.tag());
    copied.setCreatedAt(now);
    copied.setUpdatedAt(now);
    taskMapper.insertAdminTask(copied);
    replaceTaskDishes(copied.getId(), input.dishIds());

    writeOperationLog(
      operator.getId(),
      request.storeId(),
      copied.getId(),
      "TASK_COPIED",
      Map.of("sourceTaskId", source.getId()),
      taskLogValue(input)
    );

    return new TaskResponse(toDto(copied, store, loadLinks(copied.getId()), loadDishesByIds(input.dishIds()), true));
  }

  @Transactional
  public TaskResponse cancel(String taskId, String storeId, AdminSessionDto session) {
    AdminUserEntity operator = requireActiveOperator(session.adminUserId());
    StoreEntity store = requireStore(storeId);
    TaskEntity existing = requireTask(storeId, taskId);
    if ("DISABLED".equals(existing.getStatus())) {
      List<TaskDishEntity> links = loadLinks(existing.getId());
      return new TaskResponse(
        toDto(existing, store, links, loadDishesById(Map.of(existing.getId(), links)), true)
      );
    }
    if (existing.getEndsAt() != null && existing.getEndsAt().isBefore(LocalDateTime.now())) {
      throw new ApiException("TASK_ALREADY_ENDED", "任务已结束，不能取消", HttpStatus.BAD_REQUEST);
    }

    List<TaskDishEntity> beforeLinks = loadLinks(existing.getId());
    TaskEntity update = new TaskEntity();
    update.setId(existing.getId());
    update.setName(existing.getName());
    update.setStatus("DISABLED");
    update.setStartsAt(existing.getStartsAt());
    update.setEndsAt(existing.getEndsAt());
    update.setCutoffTime(existing.getCutoffTime());
    update.setTag(existing.getTag());
    update.setUpdatedAt(LocalDateTime.now());
    taskMapper.updateAdminTask(update);

    TaskEntity canceled = requireTask(storeId, existing.getId());
    List<TaskDishEntity> afterLinks = loadLinks(canceled.getId());
    writeOperationLog(
      operator.getId(),
      storeId,
      existing.getId(),
      "TASK_CANCELED",
      taskLogValue(existing, beforeLinks),
      taskLogValue(canceled, afterLinks)
    );

    return new TaskResponse(toDto(canceled, store, afterLinks, loadDishesById(Map.of(canceled.getId(), afterLinks)), true));
  }

  private LambdaQueryWrapper<TaskEntity> buildListWrapper(
    String storeId,
    String status,
    String query
  ) {
    LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<TaskEntity>()
      .eq(TaskEntity::getStoreId, storeId);

    if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
      wrapper.apply("\"status\" = {0}", status.trim());
    }
    if (StringUtils.hasText(query)) {
      String keyword = query.trim();
      wrapper.and(w -> w
        .like(TaskEntity::getName, keyword)
        .or()
        .like(TaskEntity::getTag, keyword)
      );
    }
    return wrapper;
  }

  private TaskSummaryDto summary(String storeId) {
    long active = countByStatus(storeId, "ACTIVE");
    long disabled = countByStatus(storeId, "DISABLED");
    long draft = countByStatus(storeId, "DRAFT");
    return new TaskSummaryDto(active, disabled, draft, active + disabled + draft);
  }

  private long countByStatus(String storeId, String status) {
    Long count = taskMapper.selectCount(
      new LambdaQueryWrapper<TaskEntity>()
        .eq(TaskEntity::getStoreId, storeId)
        .apply("\"status\" = {0}", status)
    );
    return count == null ? 0 : count;
  }

  private Map<String, List<TaskDishEntity>> loadTaskDishLinks(List<TaskEntity> tasks) {
    if (tasks.isEmpty()) {
      return Collections.emptyMap();
    }
    List<String> taskIds = tasks.stream().map(TaskEntity::getId).toList();
    return taskDishMapper
      .selectList(
        new LambdaQueryWrapper<TaskDishEntity>()
          .in(TaskDishEntity::getTaskId, taskIds)
          .orderByAsc(TaskDishEntity::getSortOrder)
      )
      .stream()
      .collect(Collectors.groupingBy(
        TaskDishEntity::getTaskId,
        LinkedHashMap::new,
        Collectors.toList()
      ));
  }

  private Map<String, DishEntity> loadDishesById(Map<String, List<TaskDishEntity>> linksByTask) {
    List<String> dishIds = linksByTask
      .values()
      .stream()
      .flatMap(List::stream)
      .map(TaskDishEntity::getDishId)
      .distinct()
      .toList();
    return loadDishesByIds(dishIds);
  }

  private Map<String, DishEntity> loadDishesByIds(List<String> dishIds) {
    if (dishIds.isEmpty()) {
      return Collections.emptyMap();
    }
    return dishMapper
      .selectBatchIds(dishIds)
      .stream()
      .collect(Collectors.toMap(DishEntity::getId, Function.identity()));
  }

  private List<TaskDishEntity> loadLinks(String taskId) {
    return taskDishMapper.selectList(
      new LambdaQueryWrapper<TaskDishEntity>()
        .eq(TaskDishEntity::getTaskId, taskId)
        .orderByAsc(TaskDishEntity::getSortOrder)
    );
  }

  private TaskItemDto toDto(
    TaskEntity task,
    StoreEntity store,
    List<TaskDishEntity> links,
    Map<String, DishEntity> dishesById,
    boolean detail
  ) {
    List<TaskDishDto> dishes = links
      .stream()
      .map(link -> toDishDto(link, dishesById.get(link.getDishId()), detail))
      .filter(dish -> dish != null)
      .toList();

    return new TaskItemDto(
      task.getCutoffTime(),
      task.getCreatedAt(),
      dishes.size(),
      dishes,
      task.getEndsAt(),
      task.getId(),
      task.getName(),
      task.getStartsAt(),
      task.getStatus(),
      new TaskStoreDto(store.getCode(), store.getId(), store.getName()),
      task.getTag(),
      task.getUpdatedAt()
    );
  }

  private TaskDishDto toDishDto(TaskDishEntity link, DishEntity dish, boolean detail) {
    if (dish == null) {
      return null;
    }
    return new TaskDishDto(
      dish.getCategory(),
      detail ? dish.getDescription() : null,
      dish.getId(),
      detail ? dish.getImageKey() : null,
      dish.getImageUrl(),
      dish.getName(),
      link.getSortOrder(),
      dish.getStatus(),
      detail ? dish.getStepJin() : null,
      dish.getStockJin()
    );
  }

  private NormalizedTaskInput normalizeTaskInput(TaskRequest request) {
    String name = normalizeRequiredText(request.name(), "NAME_REQUIRED", "请输入任务名称");
    String cutoffTime = normalizeRequiredText(
      request.cutoffTime(),
      "CUTOFF_TIME_INVALID",
      "截单时间不正确"
    );
    if (!cutoffTime.matches(CUTOFF_TIME_PATTERN)) {
      throw new ApiException("CUTOFF_TIME_INVALID", "截单时间不正确", HttpStatus.BAD_REQUEST);
    }
    if (request.startsAt() == null) {
      throw new ApiException("STARTS_AT_INVALID", "开始时间不正确", HttpStatus.BAD_REQUEST);
    }
    if (request.endsAt() == null) {
      throw new ApiException("ENDS_AT_INVALID", "结束时间不正确", HttpStatus.BAD_REQUEST);
    }
    if (!request.endsAt().isAfter(request.startsAt())) {
      throw new ApiException("TASK_RANGE_INVALID", "结束时间必须晚于开始时间", HttpStatus.BAD_REQUEST);
    }
    String status = normalizeRequiredText(request.status(), "STATUS_INVALID", "任务状态不正确");
    validateStatus(status);

    List<String> dishIds = normalizeDishIds(request.dishIds());
    return new NormalizedTaskInput(
      cutoffTime,
      dishIds,
      request.endsAt(),
      name,
      request.startsAt(),
      status,
      nullableText(request.tag())
    );
  }

  private List<String> normalizeDishIds(List<String> input) {
    if (input == null || input.isEmpty()) {
      throw new ApiException("DISH_IDS_INVALID", "请选择不重复的菜品", HttpStatus.BAD_REQUEST);
    }
    List<String> dishIds = new ArrayList<>();
    for (String value : input) {
      String dishId = nullableText(value);
      if (!StringUtils.hasText(dishId)) {
        throw new ApiException("DISH_IDS_INVALID", "请选择不重复的菜品", HttpStatus.BAD_REQUEST);
      }
      dishIds.add(dishId);
    }
    if (new LinkedHashSet<>(dishIds).size() != dishIds.size()) {
      throw new ApiException("DISH_IDS_INVALID", "请选择不重复的菜品", HttpStatus.BAD_REQUEST);
    }
    return List.copyOf(dishIds);
  }

  private void ensureTaskDishes(String storeId, List<String> dishIds) {
    Long count = dishMapper.selectCount(
      new LambdaQueryWrapper<DishEntity>()
        .eq(DishEntity::getStoreId, storeId)
        .in(DishEntity::getId, dishIds)
        .isNull(DishEntity::getDeletedAt)
    );
    if (count == null || count != dishIds.size()) {
      throw new ApiException("DISH_NOT_FOUND", "菜品不存在或不属于当前门店", HttpStatus.BAD_REQUEST);
    }
  }

  private void ensureTaskTimeRangeAvailable(
    String storeId,
    LocalDateTime startsAt,
    LocalDateTime endsAt,
    String status,
    String excludeTaskId
  ) {
    if ("DISABLED".equals(status)) {
      return;
    }

    LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<TaskEntity>()
      .eq(TaskEntity::getStoreId, storeId)
      .ne(TaskEntity::getStatus, "DISABLED")
      .lt(TaskEntity::getStartsAt, endsAt)
      .gt(TaskEntity::getEndsAt, startsAt);

    if (StringUtils.hasText(excludeTaskId)) {
      wrapper.ne(TaskEntity::getId, excludeTaskId);
    }

    Long conflictCount = taskMapper.selectCount(wrapper);
    if (conflictCount != null && conflictCount > 0) {
      throw new ApiException(
        "TASK_TIME_RANGE_CONFLICT",
        "同一时间段已存在任务，请调整任务开始或结束时间",
        HttpStatus.CONFLICT
      );
    }
  }

  private void replaceTaskDishes(String taskId, List<String> dishIds) {
    taskDishMapper.deleteByTaskId(taskId);
    for (int index = 0; index < dishIds.size(); index += 1) {
      TaskDishEntity link = new TaskDishEntity();
      link.setTaskId(taskId);
      link.setDishId(dishIds.get(index));
      link.setSortOrder(index);
      taskDishMapper.insertTaskDish(link);
    }
  }

  private TaskEntity requireTask(String storeId, String taskId) {
    TaskEntity task = taskMapper.selectOne(
      new LambdaQueryWrapper<TaskEntity>()
        .eq(TaskEntity::getId, taskId)
        .eq(TaskEntity::getStoreId, storeId)
        .last("limit 1")
    );
    if (task == null) {
      throw new ApiException("TASK_NOT_FOUND", "任务不存在", HttpStatus.NOT_FOUND);
    }
    return task;
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
    if (!TASK_STATUSES.contains(status)) {
      throw new ApiException("STATUS_INVALID", "任务状态不正确", HttpStatus.BAD_REQUEST);
    }
  }

  private Map<String, Object> taskLogValue(NormalizedTaskInput input) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("cutoffTime", input.cutoffTime());
    value.put("dishIds", input.dishIds());
    value.put("endsAt", input.endsAt());
    value.put("name", input.name());
    value.put("startsAt", input.startsAt());
    value.put("status", input.status());
    value.put("tag", input.tag());
    return value;
  }

  private Map<String, Object> taskLogValue(TaskEntity task, List<TaskDishEntity> links) {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("cutoffTime", task.getCutoffTime());
    value.put("dishIds", links.stream().map(TaskDishEntity::getDishId).toList());
    value.put("endsAt", task.getEndsAt());
    value.put("name", task.getName());
    value.put("startsAt", task.getStartsAt());
    value.put("status", task.getStatus());
    value.put("tag", task.getTag());
    return value;
  }

  private void writeOperationLog(
    String operatorId,
    String storeId,
    String taskId,
    String action,
    Object beforeValue,
    Object afterValue
  ) {
    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setId(id());
    log.setOperatorId(operatorId);
    log.setStoreId(storeId);
    log.setResource("task");
    log.setResourceId(taskId);
    log.setAction(action);
    log.setBeforeValue(toJson(beforeValue));
    log.setAfterValue(toJson(afterValue));
    log.setRequestParams("{}");
    log.setResponseData("{}");
    log.setStatusCode(200);
    log.setCreatedAt(LocalDateTime.now());
    adminOperationLogMapper.insertLog(log);
  }

  private String toJson(Object value) {
    try {
      return value == null ? "null" : objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      return "{}";
    }
  }

  private String normalizeRequiredText(String value, String code, String message) {
    String normalized = nullableText(value);
    if (!StringUtils.hasText(normalized)) {
      throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private String nullableText(String value) {
    String trimmed = value == null ? "" : value.trim();
    return StringUtils.hasText(trimmed) ? trimmed : null;
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }

  private record NormalizedTaskInput(
    String cutoffTime,
    List<String> dishIds,
    LocalDateTime endsAt,
    String name,
    LocalDateTime startsAt,
    String status,
    String tag
  ) {}
}
