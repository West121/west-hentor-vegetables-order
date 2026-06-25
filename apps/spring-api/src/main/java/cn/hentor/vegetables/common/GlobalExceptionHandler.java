package cn.hentor.vegetables.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
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

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValidException(
    MethodArgumentNotValidException exception
  ) {
    String message = exception.getBindingResult()
      .getFieldErrors()
      .stream()
      .map(error -> error.getDefaultMessage())
      .filter(StringUtils::hasText)
      .findFirst()
      .orElse("请检查必填项和字段格式");
    return ResponseEntity
      .status(HttpStatus.BAD_REQUEST)
      .body(ApiResponse.fail("INVALID_PARAMS", message));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(
    ConstraintViolationException exception
  ) {
    String message = exception.getConstraintViolations()
      .stream()
      .map(violation -> violation.getMessage())
      .filter(StringUtils::hasText)
      .findFirst()
      .orElse("请检查必填项和字段格式");
    return ResponseEntity
      .status(HttpStatus.BAD_REQUEST)
      .body(ApiResponse.fail("INVALID_PARAMS", message));
  }
}
