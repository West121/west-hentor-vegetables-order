package cn.hentor.vegetables.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MybatisPlusConfig {
  @Value("${spring.datasource.url:}")
  private String datasourceUrl;

  @Bean
  public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(resolveDbType()));
    return interceptor;
  }

  private DbType resolveDbType() {
    return datasourceUrl != null && datasourceUrl.startsWith("jdbc:postgresql:")
      ? DbType.POSTGRE_SQL
      : DbType.MYSQL;
  }
}
