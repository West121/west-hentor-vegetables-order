package cn.hentor.vegetables.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.Set;
import org.junit.jupiter.api.Test;

class GlobalExceptionHandlerTest {
  @Test
  void returnsConstraintViolationMessageInsteadOfGenericInvalidParams() {
    ConstraintViolation<?> violation = mock(ConstraintViolation.class);
    when(violation.getMessage()).thenReturn("初始密码至少需要 8 位");

    var response = new GlobalExceptionHandler()
      .handleConstraintViolationException(
        new ConstraintViolationException(Set.of(violation))
      );

    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().error().code()).isEqualTo("INVALID_PARAMS");
    assertThat(response.getBody().error().message()).isEqualTo("初始密码至少需要 8 位");
  }
}
