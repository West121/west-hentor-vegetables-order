package cn.hentor.vegetables.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.hentor.vegetables.entity.DishEntity;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface DishMapper extends BaseMapper<DishEntity> {
  @Insert("""
    INSERT INTO "Dish" (
      "id", "storeId", "name", "category", "status", "stepJin", "stockJin",
      "imageKey", "imageUrl", "description", "sortOrder", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{storeId}, #{name}, #{category},
      #{status}, #{stepJin}, #{stockJin},
      #{imageKey}, #{imageUrl}, #{description}, #{sortOrder}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertAdminDish(DishEntity dish);

  @Update("""
    UPDATE "Dish"
    SET "name" = #{name},
        "category" = #{category},
        "status" = #{status},
        "stepJin" = #{stepJin},
        "imageKey" = #{imageKey},
        "imageUrl" = #{imageUrl},
        "description" = #{description},
        "sortOrder" = #{sortOrder},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateAdminDish(DishEntity dish);

  @Update("""
    UPDATE "Dish"
    SET "stockJin" = #{stockJin},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateStock(
    @Param("id") String id,
    @Param("stockJin") BigDecimal stockJin,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "Dish"
    SET "stockJin" = "stockJin" + #{changeJin},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int incrementStock(
    @Param("id") String id,
    @Param("changeJin") BigDecimal changeJin,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "Dish"
    SET "stockJin" = #{stockJin},
        "status" = 'OFF_SALE',
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateStockAndOffSale(
    @Param("id") String id,
    @Param("stockJin") BigDecimal stockJin,
    @Param("updatedAt") LocalDateTime updatedAt
  );

  @Update("""
    UPDATE "Dish"
    SET "stockJin" = #{stockJin},
        "status" = #{status},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updateInventoryAndStatus(DishEntity dish);

  @Select("""
    SELECT COALESCE(SUM("stockJin"), 0)
    FROM "Dish"
    WHERE "storeId" = #{storeId}
      AND "deletedAt" IS NULL
    """)
  BigDecimal sumStockByStore(@Param("storeId") String storeId);
}
