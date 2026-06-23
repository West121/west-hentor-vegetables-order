package cn.hentor.vegetables.mapper;

import com.github.yulichang.base.MPJBaseMapper;
import cn.hentor.vegetables.entity.OrderEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Update;

public interface OrderMapper extends MPJBaseMapper<OrderEntity> {
  @Insert("""
    INSERT INTO "Order" (
      "id", "storeId", "userId", "userPackageId", "addressId", "orderNo",
      "status", "totalWeightJin", "addressSnapshot", "userVisibleRemark",
      "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{storeId}, #{userId}, #{userPackageId}, #{addressId}, #{orderNo},
      'PENDING_SHIPMENT', #{totalWeightJin}, #{addressSnapshot},
      #{userVisibleRemark}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertMiniOrder(OrderEntity order);

  @Update("""
    UPDATE "Order"
    SET "addressId" = #{addressId},
        "addressSnapshot" = #{addressSnapshot},
        "totalWeightJin" = #{totalWeightJin},
        "userVisibleRemark" = #{userVisibleRemark},
        "modifiedAt" = #{modifiedAt},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateMiniOrder(OrderEntity order);

  @Update("""
    UPDATE "Order"
    SET "logisticsNo" = #{logisticsNo},
        "shippedAt" = #{shippedAt},
        "status" = 'SHIPPED',
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int markShipped(OrderEntity order);

  @Update("""
    UPDATE "Order"
    SET "internalRemark" = #{internalRemark},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateInternalRemark(OrderEntity order);

  @Update("""
    UPDATE "Order"
    SET "signedAt" = #{signedAt},
        "status" = 'SIGNED',
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int markSigned(OrderEntity order);

  @Update("""
    UPDATE "Order"
    SET "cancelReason" = #{cancelReason},
        "canceledAt" = #{canceledAt},
        "status" = 'VOIDED',
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int markVoided(OrderEntity order);

  @Update("""
    UPDATE "Order"
    SET "cancelReason" = #{cancelReason},
        "canceledAt" = #{canceledAt},
        "status" = 'CANCELED',
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int markCanceled(OrderEntity order);

  @Update("""
    UPDATE "Order"
    SET "deletedByUserAt" = #{deletedByUserAt},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int markDeletedByUser(OrderEntity order);
}
