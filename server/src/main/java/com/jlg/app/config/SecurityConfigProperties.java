package com.jlg.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties("security")
@Data
@Component
public class SecurityConfigProperties {
  String persistentLoginKey;
}