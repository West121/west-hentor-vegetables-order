package cn.hentor.vegetables.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException exception) {
    return ResponseEntity
      .status(exception.getStatus())
      .body(ApiResponse.fail(exception.getCode(), exception.getMessage()));
  }

  @ExceptionHandler({ MethodArgumentNotValidException.class, ConstraintViolationException.class })
  public ResponseEntity<ApiResponse<Void>> handleValidationException(Exception exception) {
    return ResponseEntity
      .status(HttpStatus.BAD_REQUEST)
      .body(ApiResponse.fail("INVALID_PARAMS", "请求参数不完整"));
  }
}
