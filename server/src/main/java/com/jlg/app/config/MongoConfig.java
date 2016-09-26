package com.jlg.app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.data.mongo.JdkMongoSessionConverter;

@Configuration
public class MongoConfig {
  @Bean
  public JdkMongoSessionConverter jdkMongoSessionConverter() {
    return new JdkMongoSessionConverter();
  }
}
