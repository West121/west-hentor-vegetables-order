package cn.hentor.vegetables.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import cn.hentor.vegetables.dto.StoreDto;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.mapper.StoreMapper;
import org.springframework.stereotype.Service;

@Service
public class StoreService {
  private final StoreMapper storeMapper;

  public StoreService(StoreMapper storeMapper) {
    this.storeMapper = storeMapper;
  }

  public StoreDto getByCode(String code) {
    StoreEntity store = storeMapper.selectOne(
      new LambdaQueryWrapper<StoreEntity>().eq(StoreEntity::getCode, code).last("limit 1")
    );
    if (store == null) {
      return null;
    }

    return toDto(store);
  }

  private StoreDto toDto(StoreEntity store) {
    String address = String.join(
      "",
      valueOrEmpty(store.getProvince()),
      valueOrEmpty(store.getCity()),
      valueOrEmpty(store.getDistrict()),
      valueOrEmpty(store.getAddress())
    );

    return new StoreDto(
      store.getId(),
      store.getCode(),
      store.getName(),
      store.getStatus(),
      store.getContactName(),
      store.getContactPhone(),
      address,
      store.getCutoffTime()
    );
  }

  private String valueOrEmpty(String value) {
    return value == null ? "" : value;
  }
}
