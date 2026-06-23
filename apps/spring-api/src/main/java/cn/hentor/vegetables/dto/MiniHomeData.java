package cn.hentor.vegetables.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record MiniHomeData(
  MiniStoreDto store,
  MiniTaskDto task,
  @JsonProperty("package") MiniPackageDto packageInfo,
  MiniMemberDto member,
  MiniAddressDto defaultAddress,
  List<MiniHomeDishDto> dishes,
  MiniCurrentOrderDto currentOrder
) {}
