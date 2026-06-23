package cn.hentor.vegetables.service;

import cn.hentor.vegetables.dto.MiniAddressDto;
import cn.hentor.vegetables.dto.MiniMemberDto;
import cn.hentor.vegetables.dto.MiniOrderListData;
import cn.hentor.vegetables.dto.MiniProfileData;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.entity.AddressEntity;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.mapper.AddressMapper;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class MiniProfileService {
  private final AddressMapper addressMapper;
  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final MiniAuthService miniAuthService;
  private final MiniOrderService miniOrderService;
  private final MiniPackageService miniPackageService;
  private final UserMapper userMapper;

  public MiniProfileService(
    AddressMapper addressMapper,
    MemberStoreBindingMapper memberStoreBindingMapper,
    MiniAuthService miniAuthService,
    MiniOrderService miniOrderService,
    MiniPackageService miniPackageService,
    UserMapper userMapper
  ) {
    this.addressMapper = addressMapper;
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.miniAuthService = miniAuthService;
    this.miniOrderService = miniOrderService;
    this.miniPackageService = miniPackageService;
    this.userMapper = userMapper;
  }

  public MiniProfileData getProfile(MiniSessionContext session, String storeCode) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), storeCode);
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getStoreId, store.getId())
        .eq(MemberStoreBindingEntity::getUserId, session.userId())
        .last("limit 1")
    );
    UserEntity user = userMapper.selectById(session.userId());
    MiniOrderListData orders = miniOrderService.listOrdersForUser(session.userId(), store.getId());

    return new MiniProfileData(
      miniPackageService.getCurrentPackage(session.userId(), store.getId()),
      loadDefaultAddress(session.userId(), store.getId()),
      binding == null || user == null
        ? null
        : new MiniMemberDto(
          binding.getStatus(),
          user.getDisabledReason(),
          user.getId(),
          user.getNickname(),
          user.getPhone(),
          user.getStatus()
        ),
      orders.summary(),
      orders.items().stream().limit(3).toList(),
      miniAuthService.toStoreDto(store)
    );
  }

  private MiniAddressDto loadDefaultAddress(String userId, String storeId) {
    AddressEntity address = addressMapper.selectOne(
      new LambdaQueryWrapper<AddressEntity>()
        .eq(AddressEntity::getUserId, userId)
        .eq(AddressEntity::getStoreId, storeId)
        .eq(AddressEntity::getIsDefault, true)
        .orderByDesc(AddressEntity::getCreatedAt)
        .last("limit 1")
    );
    return address == null ? null : toAddressDto(address);
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
