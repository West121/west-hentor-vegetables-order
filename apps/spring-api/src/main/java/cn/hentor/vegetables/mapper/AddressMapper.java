package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.AddressEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Update;

public interface AddressMapper extends BaseMapper<AddressEntity> {
  @Update("""
    UPDATE "Address"
    SET "receiverName" = #{receiverName},
        "receiverPhone" = #{receiverPhone},
        "province" = #{province},
        "city" = #{city},
        "district" = #{district},
        "detail" = #{detail},
        "isDefault" = #{isDefault},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateMiniAddress(AddressEntity address);

  @Update("""
    UPDATE "Address"
    SET "isDefault" = false,
        "updatedAt" = #{updatedAt}
    WHERE "userId" = #{userId}
      AND "storeId" = #{storeId}
      AND "id" <> #{id}
    """)
  int clearOtherDefaults(AddressEntity address);

  @Update("""
    UPDATE "Address"
    SET "isDefault" = true,
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int markDefault(AddressEntity address);
}
