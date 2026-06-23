package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MiniPackagePurchaseOrderDto;
import cn.hentor.vegetables.dto.MiniPackagePurchaseRequest;
import cn.hentor.vegetables.dto.MiniPackagePurchaseResponse;
import cn.hentor.vegetables.dto.MiniSessionContext;
import cn.hentor.vegetables.dto.MiniWechatPrepayDto;
import cn.hentor.vegetables.dto.MiniWechatPrepayResponse;
import cn.hentor.vegetables.entity.MemberStoreBindingEntity;
import cn.hentor.vegetables.entity.PackagePurchaseOrderEntity;
import cn.hentor.vegetables.entity.PackageTemplateEntity;
import cn.hentor.vegetables.entity.StoreEntity;
import cn.hentor.vegetables.entity.UserEntity;
import cn.hentor.vegetables.mapper.MemberStoreBindingMapper;
import cn.hentor.vegetables.mapper.PackagePurchaseOrderMapper;
import cn.hentor.vegetables.mapper.PackageTemplateMapper;
import cn.hentor.vegetables.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MiniPackagePurchaseService {
  private static final String PURCHASE_STATUS_PAYMENT_NOT_ENABLED = "PAYMENT_NOT_ENABLED";

  private final MemberStoreBindingMapper memberStoreBindingMapper;
  private final MiniAuthService miniAuthService;
  private final PackagePurchaseOrderMapper packagePurchaseOrderMapper;
  private final PackageTemplateMapper packageTemplateMapper;
  private final UserMapper userMapper;

  public MiniPackagePurchaseService(
    MemberStoreBindingMapper memberStoreBindingMapper,
    MiniAuthService miniAuthService,
    PackagePurchaseOrderMapper packagePurchaseOrderMapper,
    PackageTemplateMapper packageTemplateMapper,
    UserMapper userMapper
  ) {
    this.memberStoreBindingMapper = memberStoreBindingMapper;
    this.miniAuthService = miniAuthService;
    this.packagePurchaseOrderMapper = packagePurchaseOrderMapper;
    this.packageTemplateMapper = packageTemplateMapper;
    this.userMapper = userMapper;
  }

  @Transactional
  public MiniPackagePurchaseResponse createPurchase(
    MiniSessionContext session,
    MiniPackagePurchaseRequest request
  ) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), request.storeCode());
    ensureActiveMember(session.userId(), store.getId(), "会员已停用，暂不能购买套餐", "请先绑定当前门店后再购买套餐");

    PackageTemplateEntity template = packageTemplateMapper.selectOne(
      new LambdaQueryWrapper<PackageTemplateEntity>()
        .eq(PackageTemplateEntity::getId, request.templateId())
        .eq(PackageTemplateEntity::getStoreId, store.getId())
        .apply("\"status\" = 'ACTIVE'")
        .last("limit 1")
    );
    if (template == null) {
      throw new ApiException("PACKAGE_TEMPLATE_NOT_FOUND", "套餐模板不存在或已停用", HttpStatus.NOT_FOUND);
    }

    LocalDateTime now = LocalDateTime.now();
    PackagePurchaseOrderEntity purchaseOrder = new PackagePurchaseOrderEntity();
    purchaseOrder.setId(id());
    purchaseOrder.setStoreId(store.getId());
    purchaseOrder.setUserId(session.userId());
    purchaseOrder.setTemplateId(template.getId());
    purchaseOrder.setAmountFen(0);
    purchaseOrder.setPayChannel("WECHAT");
    purchaseOrder.setStatus(PURCHASE_STATUS_PAYMENT_NOT_ENABLED);
    purchaseOrder.setCreatedAt(now);
    purchaseOrder.setUpdatedAt(now);
    packagePurchaseOrderMapper.insertMiniPurchaseOrder(purchaseOrder);

    return new MiniPackagePurchaseResponse(toPurchaseOrderDto(purchaseOrder));
  }

  public MiniWechatPrepayResponse reserveWechatPrepay(
    MiniSessionContext session,
    String purchaseId,
    String storeCode
  ) {
    StoreEntity store = miniAuthService.findAvailableStore(session.storeId(), storeCode);
    ensureActiveMember(session.userId(), store.getId(), "会员已停用，暂不能支付套餐", "请先绑定当前门店后再支付套餐");

    PackagePurchaseOrderEntity purchaseOrder = packagePurchaseOrderMapper.selectOne(
      new LambdaQueryWrapper<PackagePurchaseOrderEntity>()
        .eq(PackagePurchaseOrderEntity::getId, purchaseId)
        .eq(PackagePurchaseOrderEntity::getStoreId, store.getId())
        .eq(PackagePurchaseOrderEntity::getUserId, session.userId())
        .last("limit 1")
    );
    if (purchaseOrder == null) {
      throw new ApiException("PACKAGE_PURCHASE_NOT_FOUND", "套餐购买意向单不存在", HttpStatus.NOT_FOUND);
    }

    return new MiniWechatPrepayResponse(new MiniWechatPrepayDto(purchaseOrder.getId(), PURCHASE_STATUS_PAYMENT_NOT_ENABLED));
  }

  private void ensureActiveMember(String userId, String storeId, String disabledMessage, String storeRequiredMessage) {
    MemberStoreBindingEntity binding = memberStoreBindingMapper.selectOne(
      new LambdaQueryWrapper<MemberStoreBindingEntity>()
        .eq(MemberStoreBindingEntity::getUserId, userId)
        .eq(MemberStoreBindingEntity::getStoreId, storeId)
        .last("limit 1")
    );
    if (binding == null) {
      throw new ApiException("STORE_REQUIRED", storeRequiredMessage, HttpStatus.BAD_REQUEST);
    }

    UserEntity user = userMapper.selectById(userId);
    if (user == null || !"ACTIVE".equals(binding.getStatus()) || !"ACTIVE".equals(user.getStatus())) {
      String reason = user == null ? "" : user.getDisabledReason();
      String message = reason == null || reason.isBlank() ? disabledMessage : "会员已停用：" + reason.trim();
      throw new ApiException("MEMBER_DISABLED", message, HttpStatus.BAD_REQUEST);
    }
  }

  private MiniPackagePurchaseOrderDto toPurchaseOrderDto(PackagePurchaseOrderEntity purchaseOrder) {
    return new MiniPackagePurchaseOrderDto(
      purchaseOrder.getAmountFen(),
      purchaseOrder.getId(),
      purchaseOrder.getPayChannel(),
      purchaseOrder.getStatus(),
      purchaseOrder.getTemplateId()
    );
  }

  private String id() {
    return UUID.randomUUID().toString().replace("-", "");
  }
}
