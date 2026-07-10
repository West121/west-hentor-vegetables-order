package cn.hentor.vegetables.service;

import cn.hentor.vegetables.entity.AdminOperationLogEntity;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class OperationLogRequestContext {
  private OperationLogRequestContext() {}

  public static void enrich(AdminOperationLogEntity log) {
    HttpServletRequest request = currentRequest();
    if (request == null) {
      if (log.getStatusCode() == null) {
        log.setStatusCode(200);
      }
      return;
    }

    if (!StringUtils.hasText(log.getRequestMethod())) {
      log.setRequestMethod(request.getMethod());
    }
    if (!StringUtils.hasText(log.getRequestPath())) {
      log.setRequestPath(request.getRequestURI());
    }
    if (!StringUtils.hasText(log.getRequestParams()) && StringUtils.hasText(request.getQueryString())) {
      log.setRequestParams("{\"queryString\":\"" + escapeJson(request.getQueryString()) + "\"}");
    }
    if (log.getStatusCode() == null) {
      log.setStatusCode(200);
    }
    if (!StringUtils.hasText(log.getIp())) {
      log.setIp(resolveIp(request));
    }
    if (!StringUtils.hasText(log.getUserAgent())) {
      log.setUserAgent(request.getHeader("user-agent"));
    }
  }

  private static HttpServletRequest currentRequest() {
    if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
      return attributes.getRequest();
    }
    return null;
  }

  private static String resolveIp(HttpServletRequest request) {
    String forwardedFor = request.getHeader("x-forwarded-for");
    if (StringUtils.hasText(forwardedFor)) {
      return forwardedFor.split(",")[0].trim();
    }
    String realIp = request.getHeader("x-real-ip");
    if (StringUtils.hasText(realIp)) {
      return realIp.trim();
    }
    return request.getRemoteAddr();
  }

  private static String escapeJson(String value) {
    return value.replace("\\", "\\\\").replace("\"", "\\\"");
  }
}
