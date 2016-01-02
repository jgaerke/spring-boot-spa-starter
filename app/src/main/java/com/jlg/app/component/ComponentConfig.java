package com.jlg.app.component;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ResourceLoader;

import static java.util.Arrays.asList;

@Configuration
public class ComponentConfig {
  @Bean
  public ComponentResourceLoader componentResourceLoader(
      final ResourceLoader resourceLoader,
      final Environment environment) {
    if (!asList(environment.getActiveProfiles()).contains("production")) {
      return new FileSystemResourceLoader(resourceLoader);
    }
    return new CachingClassPathResourceLoader(resourceLoader);
  }
}
