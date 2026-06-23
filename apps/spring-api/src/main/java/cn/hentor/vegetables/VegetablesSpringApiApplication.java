package cn.hentor.vegetables;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@MapperScan("cn.hentor.vegetables.mapper")
@SpringBootApplication
public class VegetablesSpringApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(VegetablesSpringApiApplication.class, args);
  }
}
