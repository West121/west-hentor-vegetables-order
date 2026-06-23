package cn.hentor.vegetables.config;

import cn.hentor.vegetables.config.MinioConfig.StorageProperties;
import java.nio.file.Path;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class LocalStorageWebConfig implements WebMvcConfigurer {
  private final StorageProperties properties;

  public LocalStorageWebConfig(StorageProperties properties) {
    this.properties = properties;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    if (!"local".equalsIgnoreCase(properties.getMode())) {
      return;
    }

    String publicBaseUrl = StringUtils.hasText(properties.getPublicBaseUrl())
      ? properties.getPublicBaseUrl()
      : "/uploads";
    String pattern = publicBaseUrl.replaceAll("/+$", "") + "/**";
    Path root = Path.of(properties.getLocalRoot()).toAbsolutePath().normalize();
    registry.addResourceHandler(pattern).addResourceLocations(root.toUri().toString());
  }
}
