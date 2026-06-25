package cn.hentor.vegetables.mapper;

import cn.hentor.vegetables.entity.Kuaidi100PrinterEntity;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

public interface Kuaidi100PrinterMapper extends BaseMapper<Kuaidi100PrinterEntity> {
  @Insert("""
    INSERT INTO "Kuaidi100Printer" (
      "id", "storeId", "name", "status", "isDefault", "apiKey", "apiSecret",
      "partnerId", "partnerKey", "code", "kuaidicom", "expType", "payType",
      "siid", "tempId", "senderCompany", "requestParams", "sortOrder",
      "remark", "createdAt", "updatedAt"
    )
    VALUES (
      #{id}, #{storeId}, #{name}, #{status}, #{defaultPrinter}, #{apiKey}, #{apiSecret},
      #{partnerId}, #{partnerKey}, #{code}, #{kuaidicom}, #{expType}, #{payType},
      #{siid}, #{tempId}, #{senderCompany}, #{requestParams}, #{sortOrder},
      #{remark}, #{createdAt}, #{updatedAt}
    )
    """)
  int insertPrinter(Kuaidi100PrinterEntity printer);

  @Update("""
    UPDATE "Kuaidi100Printer"
    SET "name" = #{name},
        "status" = #{status},
        "isDefault" = #{defaultPrinter},
        "apiKey" = #{apiKey},
        "apiSecret" = #{apiSecret},
        "partnerId" = #{partnerId},
        "partnerKey" = #{partnerKey},
        "code" = #{code},
        "kuaidicom" = #{kuaidicom},
        "expType" = #{expType},
        "payType" = #{payType},
        "siid" = #{siid},
        "tempId" = #{tempId},
        "senderCompany" = #{senderCompany},
        "requestParams" = #{requestParams},
        "sortOrder" = #{sortOrder},
        "remark" = #{remark},
        "updatedAt" = #{updatedAt}
    WHERE "id" = #{id}
    """)
  int updatePrinter(Kuaidi100PrinterEntity printer);

  @Update("""
    UPDATE "Kuaidi100Printer"
    SET "isDefault" = false,
        "updatedAt" = #{updatedAt}
    WHERE "storeId" = #{storeId}
    """)
  int clearDefaultPrinters(
    @Param("storeId") String storeId,
    @Param("updatedAt") LocalDateTime updatedAt
  );
}
