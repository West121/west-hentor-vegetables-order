package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.ShipmentStatsAddressDto;
import cn.hentor.vegetables.dto.ShipmentStatsDishDto;
import cn.hentor.vegetables.dto.ShipmentStatsResponse;
import cn.hentor.vegetables.dto.ShipmentStatsSummaryDto;
import cn.hentor.vegetables.entity.DishEntity;
import cn.hentor.vegetables.entity.OrderEntity;
import cn.hentor.vegetables.entity.OrderItemEntity;
import cn.hentor.vegetables.mapper.DishMapper;
import cn.hentor.vegetables.mapper.OrderItemMapper;
import cn.hentor.vegetables.mapper.OrderMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ShipmentStatsService {
  private final DishMapper dishMapper;
  private final ObjectMapper objectMapper;
  private final OrderItemMapper orderItemMapper;
  private final OrderMapper orderMapper;

  public ShipmentStatsService(
    DishMapper dishMapper,
    ObjectMapper objectMapper,
    OrderItemMapper orderItemMapper,
    OrderMapper orderMapper
  ) {
    this.dishMapper = dishMapper;
    this.objectMapper = objectMapper;
    this.orderItemMapper = orderItemMapper;
    this.orderMapper = orderMapper;
  }

  public ShipmentStatsResponse getShipmentStats(
    String storeId,
    String status,
    String dishCategory,
    String addressKeyword,
    LocalDateTime dateFrom,
    LocalDateTime dateTo
  ) {
    validateStatus(status);
    validateCategory(dishCategory);

    LambdaQueryWrapper<OrderEntity> wrapper = new LambdaQueryWrapper<OrderEntity>()
      .eq(OrderEntity::getStoreId, storeId)
      .isNull(OrderEntity::getDeletedByUserAt)
      .orderByDesc(OrderEntity::getCreatedAt);
    if (StringUtils.hasText(status)) {
      wrapper.apply("\"status\" = {0}", status.trim());
    }
    if (dateFrom != null) {
      wrapper.ge(OrderEntity::getCreatedAt, dateFrom);
    }
    if (dateTo != null) {
      wrapper.le(OrderEntity::getCreatedAt, dateTo);
    }

    List<OrderEntity> orders = orderMapper.selectList(wrapper);
    if (orders.isEmpty()) {
      return emptyStats();
    }

    Map<String, OrderEntity> orderById = orders
      .stream()
      .collect(Collectors.toMap(OrderEntity::getId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
    List<OrderItemEntity> orderItems = orderItemMapper.selectList(
      new LambdaQueryWrapper<OrderItemEntity>().in(OrderItemEntity::getOrderId, orderById.keySet())
    );
    if (orderItems.isEmpty()) {
      return emptyStats();
    }

    Map<String, DishEntity> dishById = dishMapper.selectBatchIds(
        orderItems.stream().map(OrderItemEntity::getDishId).filter(StringUtils::hasText).distinct().toList()
      )
      .stream()
      .collect(Collectors.toMap(DishEntity::getId, Function.identity(), (left, right) -> left));

    String normalizedAddressKeyword = addressKeyword == null ? "" : addressKeyword.trim();
    Map<String, DishAccumulator> dishTotals = new LinkedHashMap<>();
    Map<String, AddressAccumulator> addressTotals = new LinkedHashMap<>();
    Set<String> matchedOrderIds = new LinkedHashSet<>();
    BigDecimal totalWeight = BigDecimal.ZERO;

    Map<String, List<OrderItemEntity>> itemsByOrderId = orderItems
      .stream()
      .collect(Collectors.groupingBy(OrderItemEntity::getOrderId, LinkedHashMap::new, Collectors.toList()));

    for (OrderEntity order : orders) {
      String address = shipmentAddressText(parseAddress(order.getAddressSnapshot()));
      if (StringUtils.hasText(normalizedAddressKeyword) && !address.contains(normalizedAddressKeyword)) {
        continue;
      }

      List<OrderItemEntity> matchedItems = itemsByOrderId.getOrDefault(order.getId(), List.of())
        .stream()
        .filter(item -> {
          DishEntity dish = dishById.get(item.getDishId());
          return !StringUtils.hasText(dishCategory) || (dish != null && dishCategory.trim().equals(dish.getCategory()));
        })
        .toList();
      if (matchedItems.isEmpty()) {
        continue;
      }

      matchedOrderIds.add(order.getId());
      for (OrderItemEntity item : matchedItems) {
        DishEntity dish = dishById.get(item.getDishId());
        BigDecimal weight = normalizeWeight(item.getWeightJin());
        totalWeight = totalWeight.add(weight);
        String dishName = StringUtils.hasText(item.getDishNameSnapshot())
          ? item.getDishNameSnapshot()
          : (dish == null ? "" : dish.getName());
        String category = dish == null ? "" : dish.getCategory();

        DishAccumulator dishTotal = dishTotals.computeIfAbsent(
          item.getDishId(),
          ignored -> new DishAccumulator(category, item.getDishId(), dishName)
        );
        dishTotal.orderIds.add(order.getId());
        dishTotal.totalWeight = dishTotal.totalWeight.add(weight);

        AddressAccumulator addressTotal = addressTotals.computeIfAbsent(
          address,
          ignored -> new AddressAccumulator(address)
        );
        addressTotal.orderIds.add(order.getId());
        addressTotal.totalWeight = addressTotal.totalWeight.add(weight);
      }
    }

    List<ShipmentStatsDishDto> dishes = dishTotals
      .values()
      .stream()
      .map(item -> new ShipmentStatsDishDto(
        item.category,
        item.dishId,
        item.dishName,
        item.orderIds.size(),
        normalizeWeight(item.totalWeight)
      ))
      .sorted(Comparator.comparing(ShipmentStatsDishDto::totalWeightJin).reversed())
      .toList();
    List<ShipmentStatsAddressDto> addresses = addressTotals
      .values()
      .stream()
      .map(item -> new ShipmentStatsAddressDto(
        item.address,
        item.orderIds.size(),
        normalizeWeight(item.totalWeight)
      ))
      .sorted(Comparator.comparing(ShipmentStatsAddressDto::totalWeightJin).reversed())
      .toList();
    ShipmentStatsSummaryDto summary = new ShipmentStatsSummaryDto(
      matchedOrderIds.size(),
      normalizeWeight(totalWeight)
    );
    return new ShipmentStatsResponse(
      addresses,
      copyText(summary, dishes, addresses),
      csvText(dishes, addresses),
      dishes,
      summary
    );
  }

  private ShipmentStatsResponse emptyStats() {
    ShipmentStatsSummaryDto summary = new ShipmentStatsSummaryDto(0, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    return new ShipmentStatsResponse(List.of(), copyText(summary, List.of(), List.of()), csvText(List.of(), List.of()), List.of(), summary);
  }

  private void validateStatus(String status) {
    if (!StringUtils.hasText(status)) {
      return;
    }
    if (!List.of("PENDING_SHIPMENT", "SHIPPED", "SIGNED", "CANCELED", "VOIDED").contains(status.trim())) {
      throw new ApiException("INVALID_PARAMS", "发货统计参数不完整", HttpStatus.BAD_REQUEST);
    }
  }

  private void validateCategory(String dishCategory) {
    if (!StringUtils.hasText(dishCategory)) {
      return;
    }
    if (!List.of("LEAFY", "FRUIT", "ROOT", "MUSHROOM", "ACTIVITY").contains(dishCategory.trim())) {
      throw new ApiException("INVALID_PARAMS", "发货统计参数不完整", HttpStatus.BAD_REQUEST);
    }
  }

  private String copyText(
    ShipmentStatsSummaryDto summary,
    List<ShipmentStatsDishDto> dishes,
    List<ShipmentStatsAddressDto> addresses
  ) {
    List<String> lines = new java.util.ArrayList<>();
    lines.add("发货统计：" + summary.orderCount() + " 单，" + formatWeight(summary.totalWeightJin()) + " 斤");
    lines.add("菜品明细：");
    dishes.forEach(dish ->
      lines.add("- " + dish.dishName() + " " + formatWeight(dish.totalWeightJin()) + "斤（" + dish.orderCount() + "单）")
    );
    lines.add("地址汇总：");
    addresses.forEach(address ->
      lines.add("- " + address.address() + " " + formatWeight(address.totalWeightJin()) + "斤（" + address.orderCount() + "单）")
    );
    return String.join("\n", lines);
  }

  private String csvText(
    List<ShipmentStatsDishDto> dishes,
    List<ShipmentStatsAddressDto> addresses
  ) {
    List<String> lines = new java.util.ArrayList<>();
    lines.add("类型,名称,订单数,重量(斤)");
    dishes.forEach(dish -> lines.add(String.join(
      ",",
      "菜品",
      csvCell(dish.dishName()),
      Long.toString(dish.orderCount()),
      formatWeight(dish.totalWeightJin())
    )));
    addresses.forEach(address -> lines.add(String.join(
      ",",
      "地址",
      csvCell(address.address()),
      Long.toString(address.orderCount()),
      formatWeight(address.totalWeightJin())
    )));
    return String.join("\n", lines);
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
    String address = List
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
    return StringUtils.hasText(address) ? address : "未记录地址";
  }

  private BigDecimal normalizeWeight(BigDecimal value) {
    return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
  }

  private String formatWeight(BigDecimal value) {
    return normalizeWeight(value).stripTrailingZeros().toPlainString();
  }

  private String csvCell(String value) {
    String text = value == null ? "" : value;
    return text.matches(".*[\",\\n].*") ? "\"" + text.replace("\"", "\"\"") + "\"" : text;
  }

  private String nullToBlank(String value) {
    return value == null ? "" : value;
  }

  private static class DishAccumulator {
    private final String category;
    private final String dishId;
    private final String dishName;
    private final Set<String> orderIds = new LinkedHashSet<>();
    private BigDecimal totalWeight = BigDecimal.ZERO;

    private DishAccumulator(String category, String dishId, String dishName) {
      this.category = category;
      this.dishId = dishId;
      this.dishName = dishName;
    }
  }

  private static class AddressAccumulator {
    private final String address;
    private final Set<String> orderIds = new LinkedHashSet<>();
    private BigDecimal totalWeight = BigDecimal.ZERO;

    private AddressAccumulator(String address) {
      this.address = address;
    }
  }
}
