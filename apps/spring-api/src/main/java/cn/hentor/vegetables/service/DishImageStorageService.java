package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.config.MinioConfig.MinioProperties;
import cn.hentor.vegetables.config.MinioConfig.StorageProperties;
import cn.hentor.vegetables.dto.DishImageDto;
import cn.hentor.vegetables.dto.DishImageUploadResponse;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DishImageStorageService {
  private static final long MAX_IMAGE_SIZE = 3L * 1024L * 1024L;
  private static final Set<String> ALLOWED_TYPES = Set.of(
    "image/avif",
    "image/jpg",
    "image/jpeg",
    "image/png",
    "image/webp"
  );
  private static final Map<String, String> MIME_EXTENSIONS = Map.of(
    "image/avif",
    "avif",
    "image/jpg",
    "jpg",
    "image/jpeg",
    "jpg",
    "image/png",
    "png",
    "image/webp",
    "webp"
  );

  private final MinioClient minioClient;
  private final MinioProperties minioProperties;
  private final StorageProperties storageProperties;

  public DishImageStorageService(
    MinioClient minioClient,
    MinioProperties minioProperties,
    StorageProperties storageProperties
  ) {
    this.minioClient = minioClient;
    this.minioProperties = minioProperties;
    this.storageProperties = storageProperties;
  }

  public DishImageUploadResponse upload(MultipartFile file) {
    return upload(file, "dishes");
  }

  public DishImageUploadResponse uploadAvatar(MultipartFile file) {
    return upload(file, "avatars");
  }

  private DishImageUploadResponse upload(MultipartFile file, String folder) {
    if (file == null || file.isEmpty()) {
      throw new ApiException("INVALID_PARAMS", "请选择图片", HttpStatus.BAD_REQUEST);
    }

    String contentType = resolveContentType(file);
    if (!StringUtils.hasText(contentType) || !ALLOWED_TYPES.contains(contentType)) {
      throw new ApiException(
        "IMAGE_TYPE_INVALID",
        "仅支持 jpg、png、webp、avif 图片",
        HttpStatus.BAD_REQUEST
      );
    }

    if (file.getSize() > MAX_IMAGE_SIZE) {
      throw new ApiException("IMAGE_TOO_LARGE", "图片不能超过 3MB", HttpStatus.BAD_REQUEST);
    }

    String key = createImageObjectKey(folder, contentType);
    try {
      if (isLocalStorage()) {
        putLocalObject(file, key);
      } else {
        putMinioObject(file, key, contentType);
      }
    } catch (Exception exception) {
      throw new ApiException("UPLOAD_FAILED", "图片上传失败", HttpStatus.BAD_GATEWAY);
    }

    return new DishImageUploadResponse(
      new DishImageDto(key, contentType, file.getSize(), buildPublicUrl(key))
    );
  }

  private String resolveContentType(MultipartFile file) {
    String contentType = file.getContentType();
    if (StringUtils.hasText(contentType) && ALLOWED_TYPES.contains(contentType)) {
      return contentType;
    }

    String fileName = file.getOriginalFilename();
    if (!StringUtils.hasText(fileName) || !fileName.contains(".")) {
      return detectContentType(file, contentType);
    }

    String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    return switch (extension) {
      case "avif" -> "image/avif";
      case "jpeg", "jpg" -> "image/jpeg";
      case "png" -> "image/png";
      case "webp" -> "image/webp";
      default -> detectContentType(file, contentType);
    };
  }

  private String detectContentType(MultipartFile file, String fallback) {
    byte[] header = new byte[16];
    try (InputStream inputStream = file.getInputStream()) {
      int read = inputStream.read(header);
      if (read >= 3 && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8 && (header[2] & 0xff) == 0xff) {
        return "image/jpeg";
      }
      if (
        read >= 8 &&
        (header[0] & 0xff) == 0x89 &&
        header[1] == 0x50 &&
        header[2] == 0x4e &&
        header[3] == 0x47 &&
        header[4] == 0x0d &&
        header[5] == 0x0a &&
        header[6] == 0x1a &&
        header[7] == 0x0a
      ) {
        return "image/png";
      }
      if (
        read >= 12 &&
        header[0] == 0x52 &&
        header[1] == 0x49 &&
        header[2] == 0x46 &&
        header[3] == 0x46 &&
        header[8] == 0x57 &&
        header[9] == 0x45 &&
        header[10] == 0x42 &&
        header[11] == 0x50
      ) {
        return "image/webp";
      }
      if (
        read >= 12 &&
        header[4] == 0x66 &&
        header[5] == 0x74 &&
        header[6] == 0x79 &&
        header[7] == 0x70 &&
        header[8] == 0x61 &&
        header[9] == 0x76 &&
        header[10] == 0x69 &&
        header[11] == 0x66
      ) {
        return "image/avif";
      }
    } catch (IOException ignored) {
      return fallback;
    }
    return fallback;
  }

  private boolean isLocalStorage() {
    return !"minio".equalsIgnoreCase(storageProperties.getMode());
  }

  private void putLocalObject(MultipartFile file, String key) throws Exception {
    Path root = Path.of(storageProperties.getLocalRoot()).toAbsolutePath().normalize();
    Path target = root.resolve(key).normalize();
    if (!target.startsWith(root)) {
      throw new ApiException("INVALID_IMAGE_KEY", "图片路径不合法", HttpStatus.BAD_REQUEST);
    }

    Files.createDirectories(target.getParent());
    try (InputStream inputStream = file.getInputStream()) {
      Files.copy(inputStream, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }
  }

  private void putMinioObject(MultipartFile file, String key, String contentType) throws Exception {
    ensureBucketReady();
    minioClient.putObject(
      PutObjectArgs
        .builder()
        .bucket(minioProperties.getBucket())
        .object(key)
        .contentType(contentType)
        .stream(file.getInputStream(), file.getSize(), -1L)
        .build()
    );
  }

  private void ensureBucketReady() throws Exception {
    boolean exists = minioClient.bucketExists(
      BucketExistsArgs.builder().bucket(minioProperties.getBucket()).build()
    );
    if (exists) {
      return;
    }

    minioClient.makeBucket(MakeBucketArgs.builder().bucket(minioProperties.getBucket()).build());
    minioClient.setBucketPolicy(
      SetBucketPolicyArgs
        .builder()
        .bucket(minioProperties.getBucket())
        .config(publicReadPolicy(minioProperties.getBucket()))
        .build()
    );
  }

  private String publicReadPolicy(String bucket) {
    return """
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": "*",
            "Action": ["s3:GetObject"],
            "Resource": ["arn:aws:s3:::%s/*"]
          }
        ]
      }
      """.formatted(bucket);
  }

  private String createImageObjectKey(String folder, String contentType) {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    String ext = MIME_EXTENSIONS.getOrDefault(contentType, "jpg");
    return "%s/%d/%02d/%02d/%s.%s".formatted(
      folder,
      today.getYear(),
      today.getMonthValue(),
      today.getDayOfMonth(),
      UUID.randomUUID(),
      ext
    );
  }

  private String buildPublicUrl(String key) {
    if (isLocalStorage()) {
      String publicBaseUrl = StringUtils.hasText(storageProperties.getPublicBaseUrl())
        ? storageProperties.getPublicBaseUrl()
        : "/uploads";
      return publicBaseUrl.replaceAll("/+$", "") + "/" + key;
    }

    String baseUrl = StringUtils.hasText(minioProperties.getPublicUrl())
      ? minioProperties.getPublicUrl()
      : minioProperties.getEndpoint();
    return baseUrl.replaceAll("/+$", "") + "/" + minioProperties.getBucket() + "/" + key;
  }
}
