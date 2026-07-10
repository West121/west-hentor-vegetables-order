package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.AdminWechatLoginProperties;
import cn.hentor.vegetables.dto.AdminSessionDto;
import cn.hentor.vegetables.dto.WechatLoginSessionDto;
import cn.hentor.vegetables.entity.AdminUserEntity;
import cn.hentor.vegetables.entity.AdminWechatBindingEntity;
import cn.hentor.vegetables.mapper.AdminWechatBindingMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class AdminWechatLoginServiceTest {
  @Mock private AdminAuthService adminAuthService;
  @Mock private AdminWechatBindingMapper bindingMapper;
  @Mock private AdminWechatProviderClient providerClient;
  @Mock private SessionStore sessionStore;

  private final AdminWechatLoginProperties properties = new AdminWechatLoginProperties();
  private AdminWechatLoginService service;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    properties.setMockEnabled(true);
    service = new AdminWechatLoginService(
      adminAuthService,
      bindingMapper,
      properties,
      providerClient,
      new ObjectMapper(),
      sessionStore
    );
  }

  @Test
  void mockStartReturnsLocalCallbackAndEnablesStatus() {
    when(providerClient.authorizationUrl(any())).thenAnswer(invocation ->
      "/api/admin/auth/wechat/callback?state=" + invocation.getArgument(0)
    );

    assertThat(service.status().enabled()).isTrue();
    assertThat(service.startAuthorization()).contains("/api/admin/auth/wechat/callback");
    verify(sessionStore).set(any(), org.mockito.ArgumentMatchers.eq("pending"), any());
  }

  @Test
  void firstWechatLoginReturnsOneTimeBindToken() {
    when(sessionStore.get(AdminWechatLoginService.STATE_KEY_PREFIX + "state-1"))
      .thenReturn("pending");
    when(providerClient.exchangeCode("mock-code"))
      .thenReturn(new WechatLoginSessionDto("openid-1", "unionid-1"));
    when(bindingMapper.selectOne(any())).thenReturn(null);

    AdminWechatLoginService.AdminWechatLoginResult result = service.complete("mock-code", "state-1");

    assertThat(result.requiresBinding()).isTrue();
    assertThat(result.bindToken()).isNotBlank();
    verify(sessionStore).delete(AdminWechatLoginService.STATE_KEY_PREFIX + "state-1");
  }

  @Test
  void boundWechatLoginCreatesNormalAdminSession() {
    AdminWechatBindingEntity binding = new AdminWechatBindingEntity();
    binding.setAdminUserId("admin-1");
    binding.setOpenid("openid-1");
    AdminUserEntity admin = new AdminUserEntity();
    admin.setId("admin-1");
    admin.setStatus("ACTIVE");
    AdminSessionDto session = new AdminSessionDto(
      "session-token", "admin-1", "admin", "管理员", null,
      List.of(), List.of(), List.of(), "ALL", null
    );
    when(sessionStore.get(AdminWechatLoginService.STATE_KEY_PREFIX + "state-1"))
      .thenReturn("pending");
    when(providerClient.exchangeCode("mock-code"))
      .thenReturn(new WechatLoginSessionDto("openid-1", null));
    when(bindingMapper.selectOne(any())).thenReturn(binding);
    when(adminAuthService.findAdmin("admin-1")).thenReturn(admin);
    when(adminAuthService.createSession(admin)).thenReturn(session);

    assertThat(service.complete("mock-code", "state-1").session()).isSameAs(session);
    verify(bindingMapper).updateById(binding);
  }

  @Test
  void bindConsumesTokenAndPreservesAdminSession() throws Exception {
    String bindToken = "bind-1";
    when(sessionStore.get(AdminWechatLoginService.BIND_KEY_PREFIX + bindToken))
      .thenReturn(new ObjectMapper().writeValueAsString(new WechatLoginSessionDto("openid-1", "unionid-1")));
    when(bindingMapper.selectOne(any())).thenReturn(null);
    AdminUserEntity admin = new AdminUserEntity();
    admin.setId("admin-1");
    admin.setStatus("ACTIVE");
    AdminSessionDto session = new AdminSessionDto(
      "session-token", "admin-1", "admin", "管理员", null,
      List.of(), List.of(), List.of(), "ALL", null
    );
    when(adminAuthService.authenticateCredentials("admin", "password"))
      .thenReturn(admin);
    when(adminAuthService.createSession(admin)).thenReturn(session);

    assertThat(service.bind(bindToken, "admin", "password")).isSameAs(session);
    verify(sessionStore).delete(AdminWechatLoginService.BIND_KEY_PREFIX + bindToken);
    verify(bindingMapper).insert(any(AdminWechatBindingEntity.class));
  }

  @Test
  void rejectsReplayedState() {
    when(sessionStore.get(any())).thenReturn(null);

    assertThatThrownBy(() -> service.complete("mock-code", "replayed"))
      .isInstanceOf(ApiException.class)
      .hasMessage("微信登录回调无效，请重新扫码");
  }
}
