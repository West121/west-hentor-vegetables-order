package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniAddressDeleteResponse;
import cn.hentor.vegetables.dto.MiniAddressDeletedDto;
import cn.hentor.vegetables.dto.MiniAddressDto;
import cn.hentor.vegetables.dto.MiniAddressListData;
import cn.hentor.vegetables.dto.MiniAddressRequest;
import cn.hentor.vegetables.dto.MiniAddressResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.entity.AddressEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.mapper.AddressMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MiniAddressService {
  private static final int MAX_ADDRESS_COUNT = 10;
  private static final Pattern MAINLAND_PHONE_PATTERN = Pattern.compile("^1[3-9]\\d{9}$");

  private final AddressMapper addressMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final MiniAuthService miniAuthService;
  private final ObjectMapper objectMapper;

  public MiniAddressService(
    AddressMapper addressMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    MiniAuthService miniAuthService,
    ObjectMapper objectMapper
  ) {
    this.addressMapper = addressMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.miniAuthService = miniAuthService;
    this.objectMapper = objectMapper;
  }

  public MiniAddressListData list(MiniSessionContext session, String storeCode) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), storeCode);
    ensureActiveBinding(session.userId(), store.getId());

    List<MiniAddressDto> items = addressMapper.selectList(
        new LambdaQueryWrapper<AddressEntity>()
          .eq(AddressEntity::getUserId, session.userId())
          .eq(AddressEntity::getStoreId, store.getId())
          .orderByDesc(AddressEntity::getIsDefault)
          .orderByDesc(AddressEntity::getUpdatedAt)
      )
      .stream()
      .map(this::toAddressDto)
      .toList();

    MiniAddressDto defaultAddress = items
      .stream()
      .filter(address -> Boolean.TRUE.equals(address.isDefault()))
      .findFirst()
      .orElse(null);
    return new MiniAddressListData(defaultAddress, items);
  }

  @Transactional
  public MiniAddressResponse create(MiniSessionContext session, MiniAddressRequest request) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), request.storeCode());
    ensureActiveBinding(session.userId(), store.getId());

    long addressCount = addressMapper.selectCount(
      new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getUserId, session.userId())
        .eq(AddressEntity::getStoreId, store.getId())
    );
    if (addressCount >= MAX_ADDRESS_COUNT) {
      throw new ApiException("ADDRESS_LIMIT_EXCEEDED", "最多只能保存 10 条地址", HttpStatus.CONFLICT);
    }

    AddressEntity address = normalize(request);
    validateDeliveryRange(address, store);
    boolean isDefault = Boolean.TRUE.equals(request.isDefault()) || addressCount == 0;
    if (isDefault) {
      addressMapper.update(
        null,
        new LambdaUpdateWrapper<AddressEntity>()
          .eq(AddressEntity::getUserId, session.userId())
          .eq(AddressEntity::getStoreId, store.getId())
          .set(AddressEntity::getIsDefault, false)
      );
    }

    address.setId(UUID.randomUUID().toString().replace("-", ""));
    address.setUserId(session.userId());
    address.setStoreId(store.getId());
    address.setIsDefault(isDefault);
    address.setCreatedAt(LocalDateTime.now());
    address.setUpdatedAt(LocalDateTime.now());
    addressMapper.insert(address);

    return new MiniAddressResponse(toAddressDto(address));
  }

  @Transactional
  public MiniAddressResponse update(MiniSessionContext session, String addressId, MiniAddressRequest request) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), request.storeCode());
    ensureActiveBinding(session.userId(), store.getId());

    AddressEntity existing = requireAddress(addressId, session.userId(), store.getId());
    AddressEntity address = normalize(request);
    validateDeliveryRange(address, store);
    if (Boolean.TRUE.equals(request.isDefault())) {
      AddressEntity clearDefaultsScope = new AddressEntity();
      clearDefaultsScope.setId(addressId);
      clearDefaultsScope.setUserId(session.userId());
      clearDefaultsScope.setStoreId(store.getId());
      clearDefaultsScope.setUpdatedAt(LocalDateTime.now());
      addressMapper.clearOtherDefaults(clearDefaultsScope);
      address.setIsDefault(true);
    } else {
      address.setIsDefault(existing.getIsDefault());
    }

    address.setId(addressId);
    address.setUserId(session.userId());
    address.setStoreId(store.getId());
    address.setCreatedAt(existing.getCreatedAt());
    address.setUpdatedAt(LocalDateTime.now());
    addressMapper.updateMiniAddress(address);

    return new MiniAddressResponse(toAddressDto(addressMapper.selectById(addressId)));
  }

  @Transactional
  public MiniAddressResponse setDefault(MiniSessionContext session, String addressId, String storeCode) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), storeCode);
    ensureActiveBinding(session.userId(), store.getId());
    AddressEntity address = requireAddress(addressId, session.userId(), store.getId());
    validateDeliveryRange(address, store);

    LocalDateTime now = LocalDateTime.now();
    address.setUpdatedAt(now);
    addressMapper.clearOtherDefaults(address);
    addressMapper.markDefault(address);
    address.setIsDefault(true);

    return new MiniAddressResponse(toAddressDto(addressMapper.selectById(addressId)));
  }

  @Transactional
  public MiniAddressDeleteResponse delete(MiniSessionContext session, String addressId, String storeCode) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), storeCode);
    ensureActiveBinding(session.userId(), store.getId());
    AddressEntity existing = requireAddress(addressId, session.userId(), store.getId());
    boolean wasDefault = Boolean.TRUE.equals(existing.getIsDefault());
    addressMapper.deleteById(addressId);

    if (wasDefault) {
      AddressEntity nextDefault = addressMapper.selectOne(
        new LambdaQueryWrapper<AddressEntity>()
          .eq(AddressEntity::getUserId, session.userId())
          .eq(AddressEntity::getStoreId, store.getId())
          .orderByDesc(AddressEntity::getUpdatedAt)
          .orderByDesc(AddressEntity::getCreatedAt)
          .last("limit 1")
      );
      if (nextDefault != null) {
        nextDefault.setUpdatedAt(LocalDateTime.now());
        addressMapper.markDefault(nextDefault);
      }
    }

    return new MiniAddressDeleteResponse(new MiniAddressDeletedDto(addressId));
  }

  private void ensureActiveBinding(String userId, String storeId) {
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, userId)
        .eq(MemberStoreBindingEntity::getStoreId, storeId)
        .last("limit 1")
    );

    if (binding == null) {
      throw new ApiException("MEMBER_STORE_NOT_FOUND", "当前门店会员不存在", HttpStatus.NOT_FOUND);
    }

    if (!"ACTIVE".equals(binding.getStatus())) {
      throw new ApiException("MEMBER_DISABLED", "会员已停用，暂不能维护地址", HttpStatus.FORBIDDEN);
    }
  }

  private AddressEntity requireAddress(String addressId, String userId, String storeId) {
    AddressEntity address = addressMapper.selectOne(
      new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getId, addressId)
        .eq(AddressEntity::getUserId, userId)
        .eq(AddressEntity::getStoreId, storeId)
        .last("limit 1")
    );
    if (address == null) {
      throw new ApiException("ADDRESS_NOT_FOUND", "配送地址不存在", HttpStatus.NOT_FOUND);
    }
    return address;
  }

  private void validateDeliveryRange(AddressEntity address, StoreEntity store) {
    List<String> provinces = DeliveryRangeSupport.readJsonStringArray(objectMapper, store.getDeliveryProvinces());
    List<String> cities = DeliveryRangeSupport.readJsonStringArray(objectMapper, store.getDeliveryCities());
    String province = normalizeNullableText(address.getProvince());
    String city = normalizeNullableText(address.getCity());
    if (!DeliveryRangeSupport.allows(province, city, provinces, cities)) {
      throw new ApiException(
        "ADDRESS_OUT_OF_DELIVERY_RANGE",
        "当前地址不在配送范围内，仅配送：" + DeliveryRangeSupport.rangeText(provinces, cities),
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private AddressEntity normalize(MiniAddressRequest request) {
    String receiverPhone = normalizeRequiredText(
      request.receiverPhone(),
      "RECEIVER_PHONE_REQUIRED",
      "请输入联系电话"
    );
    if (!MAINLAND_PHONE_PATTERN.matcher(receiverPhone).matches()) {
      throw new ApiException("RECEIVER_PHONE_INVALID", "请输入正确的手机号", HttpStatus.BAD_REQUEST);
    }

    String detail = normalizeRequiredText(request.detail(), "DETAIL_REQUIRED", "请输入详细地址");

    AddressEntity address = new AddressEntity();
    address.setCity(normalizeNullableText(request.city()));
    address.setDetail(detail);
    address.setDistrict(normalizeNullableText(request.district()));
    address.setProvince(normalizeNullableText(request.province()));
    address.setReceiverName(normalizeRequiredText(request.receiverName(), "RECEIVER_NAME_REQUIRED", "请输入收货人"));
    address.setReceiverPhone(receiverPhone);
    return address;
  }

  private String normalizeRequiredText(String value, String code, String message) {
    String normalized = value == null ? "" : value.trim();
    if (!StringUtils.hasText(normalized)) {
      throw new ApiException(code, message, HttpStatus.BAD_REQUEST);
    }
    return normalized;
  }

  private String normalizeNullableText(String value) {
    String normalized = value == null ? "" : value.trim();
    return StringUtils.hasText(normalized) ? normalized : null;
  }

  private MiniAddressDto toAddressDto(AddressEntity address) {
    return new MiniAddressDto(
      address.getCity(),
      address.getCreatedAt(),
      address.getDetail(),
      address.getDistrict(),
      fullAddress(address),
      address.getId(),
      address.getIsDefault(),
      address.getProvince(),
      address.getReceiverName(),
      address.getReceiverPhone(),
      address.getUpdatedAt()
    );
  }

  private String fullAddress(AddressEntity address) {
    List<String> parts = new ArrayList<>();
    if (StringUtils.hasText(address.getProvince())) {
      parts.add(address.getProvince().trim());
    }
    if (StringUtils.hasText(address.getCity())) {
      parts.add(address.getCity().trim());
    }
    if (StringUtils.hasText(address.getDistrict())) {
      parts.add(address.getDistrict().trim());
    }
    if (StringUtils.hasText(address.getDetail())) {
      parts.add(address.getDetail().trim());
    }
    return String.join(" ", parts);
  }
}
