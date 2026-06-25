package cn.hentor.vegetables.service;

import static org.assertj.core.api.Assertions.assertThat;

import cn.hentor.vegetables.config.MinioConfig.MinioProperties;
import cn.hentor.vegetables.config.MinioConfig.StorageProperties;
import io.minio.MinioClient;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class DishImageStorageServiceTest {
  @TempDir
  Path tempDir;

  @Test
  void uploadsWechatAvatarTempFileWithoutExtension() {
    byte[] pngBytes = new byte[] {
      (byte) 0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      0,
      0,
      0,
      0,
    };
    StorageProperties storage = new StorageProperties();
    storage.setMode("local");
    storage.setLocalRoot(tempDir.toString());
    storage.setPublicBaseUrl("/uploads");
    DishImageStorageService service = new DishImageStorageService(
      MinioClient.builder()
        .endpoint("http://localhost:9000")
        .credentials("minio", "minio123")
        .build(),
      new MinioProperties(),
      storage
    );

    var result = service.uploadAvatar(
      new MockMultipartFile("file", "avatar", "application/octet-stream", pngBytes)
    );

    assertThat(result.image().mimeType()).isEqualTo("image/png");
    assertThat(result.image().url()).startsWith("/uploads/avatars/");
    assertThat(tempDir.resolve(result.image().key())).exists();
  }
}
