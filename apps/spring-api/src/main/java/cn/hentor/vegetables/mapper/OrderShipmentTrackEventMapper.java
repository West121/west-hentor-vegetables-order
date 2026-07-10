package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.OrderShipmentTrackEventEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;

public interface OrderShipmentTrackEventMapper extends BaseMapper<OrderShipmentTrackEventEntity> {
  @Delete("""
    DELETE FROM "OrderShipmentTrackEvent"
    WHERE "trackId" = #{trackId}
    """)
  int deleteByTrackId(String trackId);
}
