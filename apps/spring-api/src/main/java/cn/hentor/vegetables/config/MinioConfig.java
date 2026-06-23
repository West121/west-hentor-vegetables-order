package cn.hentor.vegetables.config;

import io.minio.MinioClient;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MinioConfig.StorageProperties.class)
public class MinioConfig {
  @Bean
  @ConfigurationProperties(prefix = "minio")
  public MinioProperties minioProperties() {
    return new MinioProperties();
  }

  @Bean
  public MinioClient minioClient(MinioProperties properties) {
    return MinioClient.builder()
      .endpoint(properties.getEndpoint())
      .credentials(properties.getAccessKey(), properties.getSecretKey())
      .build();
  }

  public static class MinioProperties {
    private String accessKey;
    private String bucket;
    private String endpoint;
    private String publicUrl;
    private String secretKey;

    public String getAccessKey() {
      return accessKey;
    }

    public void setAccessKey(String accessKey) {
      this.accessKey = accessKey;
    }

    public String getBucket() {
      return bucket;
    }

    public void setBucket(String bucket) {
      this.bucket = bucket;
    }

    public String getEndpoint() {
      return endpoint;
    }

    public void setEndpoint(String endpoint) {
      this.endpoint = endpoint;
    }

    public String getPublicUrl() {
      return publicUrl;
    }

    public void setPublicUrl(String publicUrl) {
      this.publicUrl = publicUrl;
    }

    public String getSecretKey() {
      return secretKey;
    }

    public void setSecretKey(String secretKey) {
      this.secretKey = secretKey;
    }
  }

  @ConfigurationProperties(prefix = "storage")
  public static class StorageProperties {
    private String localRoot;
    private String mode = "local";
    private String publicBaseUrl = "/uploads";

    public String getLocalRoot() {
      return localRoot;
    }

    public void setLocalRoot(String localRoot) {
      this.localRoot = localRoot;
    }

    public String getMode() {
      return mode;
    }

    public void setMode(String mode) {
      this.mode = mode;
    }

    public String getPublicBaseUrl() {
      return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
      this.publicBaseUrl = publicBaseUrl;
    }
  }
}
