package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.UserPackageBenefitEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

public interface UserPackageBenefitMapper extends BaseMapper<UserPackageBenefitEntity> {
  @Update("""
    UPDATE "UserPackageBenefit"
    SET "usedQuantity" = GREATEST("usedQuantity" - #{quantity}, 0),
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int decrementUsedQuantity(
    @Param("id") String id,
    @Param("quantity") BigDecimal quantity,
    @Param("updatedAt") LocalDateTime updatedAt
  );
}
