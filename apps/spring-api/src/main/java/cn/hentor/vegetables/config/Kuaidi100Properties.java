package cn.hentor.vegetables.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "kuaidi100")
public class Kuaidi100Properties {
  private String backTempId = "";
  private String childTempId = "";
  private String code = "";
  private String callbackSalt = "";
  private String callbackUrl = "";
  private String customer = "";
  private String expType = "标准快递";
  private String height = "100";
  private String key = "";
  private String kuaidicom = "shunfeng";
  private String needBack = "0";
  private String needChild = "0";
  private boolean needDesensitization = false;
  private boolean needLogo = true;
  private boolean needOcr = false;
  private String net = "";
  private String partnerId = "";
  private String partnerKey = "";
  private String partnerName = "";
  private String partnerSecret = "";
  private String payType = "SHIPPER";
  private String pollCallbackUrl = "";
  private String secret = "";
  private String senderAddress = "";
  private String senderCompany = "";
  private String senderMobile = "";
  private String siid = "";
  private String tempId = "";
  private String trackCallbackUrl = "";
  private String trackMapConfigKey = "";
  private String trackMapUrl = "https://poll.kuaidi100.com/poll/maptrack.do";
  private String trackQueryUrl = "https://poll.kuaidi100.com/poll/query.do";
  private String trackSubscribeUrl = "https://poll.kuaidi100.com/poll";
  private String type = "10";
  private String width = "75";

  public String getBackTempId() {
    return backTempId;
  }

  public void setBackTempId(String backTempId) {
    this.backTempId = backTempId;
  }

  public String getChildTempId() {
    return childTempId;
  }

  public void setChildTempId(String childTempId) {
    this.childTempId = childTempId;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public String getCallbackSalt() {
    return callbackSalt;
  }

  public void setCallbackSalt(String callbackSalt) {
    this.callbackSalt = callbackSalt;
  }

  public String getCallbackUrl() {
    return callbackUrl;
  }

  public void setCallbackUrl(String callbackUrl) {
    this.callbackUrl = callbackUrl;
  }

  public String getCustomer() {
    return customer;
  }

  public void setCustomer(String customer) {
    this.customer = customer;
  }

  public String getExpType() {
    return expType;
  }

  public void setExpType(String expType) {
    this.expType = expType;
  }

  public String getHeight() {
    return height;
  }

  public void setHeight(String height) {
    this.height = height;
  }

  public String getKey() {
    return key;
  }

  public void setKey(String key) {
    this.key = key;
  }

  public String getKuaidicom() {
    return kuaidicom;
  }

  public void setKuaidicom(String kuaidicom) {
    this.kuaidicom = kuaidicom;
  }

  public String getNeedBack() {
    return needBack;
  }

  public void setNeedBack(String needBack) {
    this.needBack = needBack;
  }

  public String getNeedChild() {
    return needChild;
  }

  public void setNeedChild(String needChild) {
    this.needChild = needChild;
  }

  public boolean isNeedDesensitization() {
    return needDesensitization;
  }

  public void setNeedDesensitization(boolean needDesensitization) {
    this.needDesensitization = needDesensitization;
  }

  public boolean isNeedLogo() {
    return needLogo;
  }

  public void setNeedLogo(boolean needLogo) {
    this.needLogo = needLogo;
  }

  public boolean isNeedOcr() {
    return needOcr;
  }

  public void setNeedOcr(boolean needOcr) {
    this.needOcr = needOcr;
  }

  public String getNet() {
    return net;
  }

  public void setNet(String net) {
    this.net = net;
  }

  public String getPartnerId() {
    return partnerId;
  }

  public void setPartnerId(String partnerId) {
    this.partnerId = partnerId;
  }

  public String getPartnerKey() {
    return partnerKey;
  }

  public void setPartnerKey(String partnerKey) {
    this.partnerKey = partnerKey;
  }

  public String getPartnerName() {
    return partnerName;
  }

  public void setPartnerName(String partnerName) {
    this.partnerName = partnerName;
  }

  public String getPartnerSecret() {
    return partnerSecret;
  }

  public void setPartnerSecret(String partnerSecret) {
    this.partnerSecret = partnerSecret;
  }

  public String getPayType() {
    return payType;
  }

  public void setPayType(String payType) {
    this.payType = payType;
  }

  public String getPollCallbackUrl() {
    return pollCallbackUrl;
  }

  public void setPollCallbackUrl(String pollCallbackUrl) {
    this.pollCallbackUrl = pollCallbackUrl;
  }

  public String getSecret() {
    return secret;
  }

  public void setSecret(String secret) {
    this.secret = secret;
  }

  public String getSenderCompany() {
    return senderCompany;
  }

  public void setSenderCompany(String senderCompany) {
    this.senderCompany = senderCompany;
  }

  public String getSenderAddress() {
    return senderAddress;
  }

  public void setSenderAddress(String senderAddress) {
    this.senderAddress = senderAddress;
  }

  public String getSenderMobile() {
    return senderMobile;
  }

  public void setSenderMobile(String senderMobile) {
    this.senderMobile = senderMobile;
  }

  public String getSiid() {
    return siid;
  }

  public void setSiid(String siid) {
    this.siid = siid;
  }

  public String getTempId() {
    return tempId;
  }

  public void setTempId(String tempId) {
    this.tempId = tempId;
  }

  public String getTrackCallbackUrl() {
    return trackCallbackUrl;
  }

  public void setTrackCallbackUrl(String trackCallbackUrl) {
    this.trackCallbackUrl = trackCallbackUrl;
  }

  public String getTrackMapConfigKey() {
    return trackMapConfigKey;
  }

  public void setTrackMapConfigKey(String trackMapConfigKey) {
    this.trackMapConfigKey = trackMapConfigKey;
  }

  public String getTrackMapUrl() {
    return trackMapUrl;
  }

  public void setTrackMapUrl(String trackMapUrl) {
    this.trackMapUrl = trackMapUrl;
  }

  public String getTrackQueryUrl() {
    return trackQueryUrl;
  }

  public void setTrackQueryUrl(String trackQueryUrl) {
    this.trackQueryUrl = trackQueryUrl;
  }

  public String getTrackSubscribeUrl() {
    return trackSubscribeUrl;
  }

  public void setTrackSubscribeUrl(String trackSubscribeUrl) {
    this.trackSubscribeUrl = trackSubscribeUrl;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getWidth() {
    return width;
  }

  public void setWidth(String width) {
    this.width = width;
  }
}
