package cn.hentor.vegetables.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.hentor.vegetables.entity.OrderShipmentEntity;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Update;

public interface OrderShipmentMapper extends BaseMapper<OrderShipmentEntity> {
  @Delete("""
    DELETE FROM "OrderShipment"
    WHERE "orderId" = #{orderId}
    """)
  int deleteByOrderId(String orderId);

  @Update("""
    UPDATE "OrderShipment"
    SET "logisticsNo" = #{logisticsNo},
        "remark" = #{remark},
        "shippedAt" = #{shippedAt},
        "status" = 'SHIPPED',
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int markPrinted(OrderShipmentEntity shipment);
}
