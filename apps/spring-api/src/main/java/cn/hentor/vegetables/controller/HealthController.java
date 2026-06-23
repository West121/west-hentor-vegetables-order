package cn.hentor.vegetables.controller;

import cn.hentor.vegetables.common.ApiResponse;
import cn.hentor.vegetables.config.MinioConfig;
import cn.hentor.vegetables.config.MinioConfig.StorageProperties;
import cn.hentor.vegetables.mapper.StoreMapper;
import cn.hentor.vegetables.service.SessionStore;
import io.minio.BucketExistsArgs;
import io.minio.MinioClient;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spring/health")
public class HealthController {
  private final MinioClient minioClient;
  private final MinioConfig.MinioProperties minioProperties;
  private final SessionStore sessionStore;
  private final StorageProperties storageProperties;
  private final StoreMapper storeMapper;

  public HealthController(
    MinioClient minioClient,
    MinioConfig.MinioProperties minioProperties,
    SessionStore sessionStore,
    StorageProperties storageProperties,
    StoreMapper storeMapper
  ) {
    this.minioClient = minioClient;
    this.minioProperties = minioProperties;
    this.sessionStore = sessionStore;
    this.storageProperties = storageProperties;
    this.storeMapper = storeMapper;
  }

  @GetMapping
  public ApiResponse<Map<String, Object>> health() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("application", "hentor-vegetables-spring-api");
    result.put("database", checkDatabase());
    result.put("session", sessionStore.status());
    result.put("storage", checkStorage());
    return ApiResponse.ok(result);
  }

  private Map<String, Object> checkDatabase() {
    Map<String, Object> result = new LinkedHashMap<>();
    try {
      result.put("ok", true);
      result.put("storeCount", storeMapper.selectCount(null));
    } catch (Exception error) {
      result.put("ok", false);
      result.put("message", error.getMessage());
    }
    return result;
  }

  private Map<String, Object> checkStorage() {
    if ("minio".equalsIgnoreCase(storageProperties.getMode())) {
      return checkMinio();
    }

    Map<String, Object> result = new LinkedHashMap<>();
    try {
      Path root = Path.of(storageProperties.getLocalRoot()).toAbsolutePath().normalize();
      Files.createDirectories(root);
      result.put("mode", "local");
      result.put("ok", Files.isDirectory(root) && Files.isWritable(root));
      result.put("root", root.toString());
      result.put("publicBaseUrl", storageProperties.getPublicBaseUrl());
    } catch (Exception error) {
      result.put("mode", "local");
      result.put("ok", false);
      result.put("message", error.getMessage());
    }
    return result;
  }

  private Map<String, Object> checkMinio() {
    Map<String, Object> result = new LinkedHashMap<>();
    try {
      boolean exists = minioClient.bucketExists(
        BucketExistsArgs.builder().bucket(minioProperties.getBucket()).build()
      );
      result.put("bucket", minioProperties.getBucket());
      result.put("ok", exists);
    } catch (Exception error) {
      result.put("bucket", minioProperties.getBucket());
      result.put("ok", false);
      result.put("message", error.getMessage());
    }
    return result;
  }
}
