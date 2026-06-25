package cn.hentor.vegetables.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("\"Kuaidi100Printer\"")
public class Kuaidi100PrinterEntity {
  @TableId("\"id\"")
  private String id;

  @TableField("\"storeId\"")
  private String storeId;

  @TableField("\"name\"")
  private String name;

  @TableField("\"status\"")
  private String status;

  @TableField("\"isDefault\"")
  private Boolean defaultPrinter;

  @TableField("\"apiKey\"")
  private String apiKey;

  @TableField("\"apiSecret\"")
  private String apiSecret;

  @TableField("\"partnerId\"")
  private String partnerId;

  @TableField("\"partnerKey\"")
  private String partnerKey;

  @TableField("\"code\"")
  private String code;

  @TableField("\"kuaidicom\"")
  private String kuaidicom;

  @TableField("\"expType\"")
  private String expType;

  @TableField("\"payType\"")
  private String payType;

  @TableField("\"siid\"")
  private String siid;

  @TableField("\"tempId\"")
  private String tempId;

  @TableField("\"senderCompany\"")
  private String senderCompany;

  @TableField("\"requestParams\"")
  private String requestParams;

  @TableField("\"sortOrder\"")
  private Integer sortOrder;

  @TableField("\"remark\"")
  private String remark;

  @TableField("\"createdAt\"")
  private LocalDateTime createdAt;

  @TableField("\"updatedAt\"")
  private LocalDateTime updatedAt;
}
