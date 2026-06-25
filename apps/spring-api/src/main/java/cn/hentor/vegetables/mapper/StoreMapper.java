package cn.hentor.vegetables.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.hentor.vegetables.entity.StoreEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;

public interface StoreMapper extends BaseMapper<StoreEntity> {
  @Insert("""
    INSERT INTO "Store" (
      "id", "franchiseeId", "code", "name", "type", "status",
      "contactName", "contactPhone", "province", "city", "district", "address",
      "deliveryProvinces", "deliveryCities", "customerServiceTel", "cutoffTime",
      "franchiseEndsAt", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{franchiseeId}, #{code}, #{name}, #{type}, #{status},
      #{contactName}, #{contactPhone}, #{province}, #{city}, #{district}, #{address},
      #{deliveryProvinces}, #{deliveryCities}, #{customerServiceTel}, #{cutoffTime},
      #{franchiseEndsAt}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertAdminStore(StoreEntity store);

  @Update("""
    UPDATE "Store"
    SET "franchiseeId" = #{franchiseeId},
        "code" = #{code},
        "name" = #{name},
        "type" = #{type},
        "status" = #{status},
        "contactName" = #{contactName},
        "contactPhone" = #{contactPhone},
        "province" = #{province},
        "city" = #{city},
        "district" = #{district},
        "address" = #{address},
        "deliveryProvinces" = #{deliveryProvinces},
        "deliveryCities" = #{deliveryCities},
        "customerServiceTel" = #{customerServiceTel},
        "cutoffTime" = #{cutoffTime},
        "franchiseEndsAt" = #{franchiseEndsAt},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminStore(StoreEntity store);

  @Update("""
    UPDATE "Store"
    SET "customerServiceTel" = #{customerServiceTel},
        "deliveryCities" = #{deliveryCities},
        "deliveryProvinces" = #{deliveryProvinces},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateSystemSettings(StoreEntity store);
}
