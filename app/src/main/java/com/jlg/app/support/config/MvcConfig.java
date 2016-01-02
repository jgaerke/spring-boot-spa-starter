package com.jlg.app.support.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.thymeleaf.ThymeleafProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurerAdapter;
import org.thymeleaf.templateresolver.FileTemplateResolver;
import org.thymeleaf.templateresolver.TemplateResolver;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;

import static java.util.Arrays.asList;

@Configuration
public class MvcConfig extends WebMvcConfigurerAdapter {
  @Autowired
  Environment environment;

  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    super.addViewControllers(registry);
    registry.addViewController("/app").setViewName("app");
    registry.addViewController("/app/**").setViewName("app");
    registry.addViewController("/").setViewName("home");
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    if (!asList(environment.getActiveProfiles()).contains("production")) {
      System.out.println("here");
      try {
        String resourceDirectory = "file://" + new File(".").getCanonicalPath() +
            "/app/src/main/resources/static/";
        registry.addResourceHandler("/**").addResourceLocations(resourceDirectory).setCachePeriod(0);
      } catch (IOException e) {
        e.printStackTrace();
      }
    }
  }

  @Bean
  @Profile("!production")
  public TemplateResolver defaultTemplateResolver(
      ThymeleafProperties properties) {
    FileTemplateResolver resolver = new FileTemplateResolver();
    resolver.setSuffix(properties.getSuffix());
    resolver.setPrefix("src/main/resources/templates/");
    resolver.setTemplateMode(properties.getMode());
    resolver.setCharacterEncoding(String.valueOf(properties.getEncoding()));
    resolver.setCacheable(false);
    return resolver;
  }
}
