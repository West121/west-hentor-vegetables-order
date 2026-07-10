package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class OperationLogRequestContextTest {
  @AfterEach
  void clearRequestContext() {
    RequestContextHolder.resetRequestAttributes();
  }

  @Test
  void enrichesMissingHttpMetadataFromCurrentRequest() {
    MockHttpServletRequest request = new MockHttpServletRequest("PATCH", "/api/admin/dishes/1");
    request.setQueryString("page=1&keyword=番茄");
    request.addHeader("x-forwarded-for", "10.0.0.8, 127.0.0.1");
    request.addHeader("user-agent", "vitest-browser");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    AdminOperationLogEntity log = new AdminOperationLogEntity();

    OperationLogRequestContext.enrich(log);

    assertThat(log.getRequestMethod()).isEqualTo("PATCH");
    assertThat(log.getRequestPath()).isEqualTo("/api/admin/dishes/1");
    assertThat(log.getRequestParams()).isEqualTo("{\"queryString\":\"page=1&keyword=番茄\"}");
    assertThat(log.getStatusCode()).isEqualTo(200);
    assertThat(log.getIp()).isEqualTo("10.0.0.8");
    assertThat(log.getUserAgent()).isEqualTo("vitest-browser");
  }

  @Test
  void keepsExistingExplicitMetadata() {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/dishes");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    AdminOperationLogEntity log = new AdminOperationLogEntity();
    log.setRequestMethod("PUT");
    log.setRequestPath("/custom");
    log.setStatusCode(201);
    log.setIp("127.0.0.2");
    log.setUserAgent("custom-agent");

    OperationLogRequestContext.enrich(log);

    assertThat(log.getRequestMethod()).isEqualTo("PUT");
    assertThat(log.getRequestPath()).isEqualTo("/custom");
    assertThat(log.getStatusCode()).isEqualTo(201);
    assertThat(log.getIp()).isEqualTo("127.0.0.2");
    assertThat(log.getUserAgent()).isEqualTo("custom-agent");
  }
}
