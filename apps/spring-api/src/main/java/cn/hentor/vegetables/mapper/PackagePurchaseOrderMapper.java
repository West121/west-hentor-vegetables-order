package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.PackagePurchaseOrderEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;

public interface PackagePurchaseOrderMapper extends BaseMapper<PackagePurchaseOrderEntity> {
  @Insert("""
    INSERT INTO "PackagePurchaseOrder" (
      "id", "storeId", "userId", "templateId", "amountFen", "status",
      "payChannel", "expiresAt", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{storeId}, #{userId}, #{templateId}, #{amountFen},
      #{status}, #{payChannel}, #{expiresAt},
      #{createdAt}, #{updatedAt}
    )
    """)
  int insertMiniPurchaseOrder(PackagePurchaseOrderEntity purchaseOrder);
}
