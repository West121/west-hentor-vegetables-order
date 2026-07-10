package cn.hentor.vegetables.config;

import cn.hentor.vegetables.service.AdminAuthService;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Maps the environment-specific cookie to the legacy name used by admin controllers. */
@Component
public class AdminSessionCookieFilter implements Filter {
  private final String sessionCookieName;

  public AdminSessionCookieFilter(
    @Value("${hentor.admin.session-cookie-name:${ADMIN_SESSION_COOKIE_NAME:hentor_spring_admin_session}}")
    String sessionCookieName
  ) {
    this.sessionCookieName = sessionCookieName;
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
    throws IOException, ServletException {
    if (!(request instanceof HttpServletRequest httpRequest)
      || AdminAuthService.SESSION_COOKIE.equals(sessionCookieName)) {
      chain.doFilter(request, response);
      return;
    }
    chain.doFilter(new EnvironmentCookieRequest(httpRequest, sessionCookieName), response);
  }

  private static final class EnvironmentCookieRequest extends HttpServletRequestWrapper {
    private final String sessionCookieName;

    private EnvironmentCookieRequest(HttpServletRequest request, String sessionCookieName) {
      super(request);
      this.sessionCookieName = sessionCookieName;
    }

    @Override
    public Cookie[] getCookies() {
      Cookie[] source = super.getCookies();
      String environmentToken = null;
      List<Cookie> cookies = new ArrayList<>();
      if (source != null) {
        for (Cookie cookie : source) {
          if (sessionCookieName.equals(cookie.getName())) {
            environmentToken = cookie.getValue();
          } else if (!AdminAuthService.SESSION_COOKIE.equals(cookie.getName())) {
            cookies.add(cookie);
          }
        }
      }
      if (environmentToken != null) {
        cookies.add(new Cookie(AdminAuthService.SESSION_COOKIE, environmentToken));
      }
      return cookies.toArray(Cookie[]::new);
    }
  }
}
