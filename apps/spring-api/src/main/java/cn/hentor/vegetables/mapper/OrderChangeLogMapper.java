package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.OrderChangeLogEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;

public interface OrderChangeLogMapper extends BaseMapper<OrderChangeLogEntity> {
  @Insert("""
    INSERT INTO "OrderChangeLog" (
      "id", "orderId", "beforeItems", "afterItems", "beforeAddress",
      "afterAddress", "source", "operatorId", "createdAt"
    )
    VALUES (
      #{id}, #{orderId}, #{beforeItems}, #{afterItems},
      #{beforeAddress}, #{afterAddress},
      #{source}, #{operatorId}, #{createdAt}
    )
    """)
  int insertMiniChangeLog(OrderChangeLogEntity log);
}
