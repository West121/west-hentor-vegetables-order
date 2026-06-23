package cn.hentor.vegetables.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class SessionStore {
  private final Map<String, LocalSession> localSessions = new ConcurrentHashMap<>();
  private final StringRedisTemplate redisTemplate;

  public SessionStore(StringRedisTemplate redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  public void set(String key, String value, Duration ttl) {
    try {
      redisTemplate.opsForValue().set(key, value, ttl);
      return;
    } catch (Exception ignored) {
      // Redis is optional for single-node nohup deployment.
    }
    localSessions.put(key, new LocalSession(value, Instant.now().plus(ttl)));
  }

  public String get(String key) {
    try {
      String value = redisTemplate.opsForValue().get(key);
      if (StringUtils.hasText(value)) {
        return value;
      }
    } catch (Exception ignored) {
      // Fall back to process memory when Redis is unavailable.
    }

    LocalSession session = localSessions.get(key);
    if (session == null) {
      return null;
    }
    if (Instant.now().isAfter(session.expiresAt())) {
      localSessions.remove(key);
      return null;
    }
    return session.value();
  }

  public void expire(String key, Duration ttl) {
    try {
      redisTemplate.expire(key, ttl);
      return;
    } catch (Exception ignored) {
      // Fall back to process memory when Redis is unavailable.
    }

    LocalSession session = localSessions.get(key);
    if (session != null) {
      localSessions.put(key, new LocalSession(session.value(), Instant.now().plus(ttl)));
    }
  }

  public void delete(String key) {
    try {
      redisTemplate.delete(key);
    } catch (Exception ignored) {
      // Fall back to process memory when Redis is unavailable.
    }
    localSessions.remove(key);
  }

  public Map<String, Object> status() {
    try {
      String pong = redisTemplate.getConnectionFactory()
        .getConnection()
        .ping();
      return Map.of(
        "ok", "PONG".equalsIgnoreCase(pong),
        "mode", "redis",
        "message", pong == null ? "" : pong
      );
    } catch (Exception error) {
      return Map.of(
        "ok", true,
        "mode", "memory",
        "message", "Redis unavailable, using in-memory sessions",
        "localSessions", localSessions.size()
      );
    }
  }

  private record LocalSession(String value, Instant expiresAt) {}
}
