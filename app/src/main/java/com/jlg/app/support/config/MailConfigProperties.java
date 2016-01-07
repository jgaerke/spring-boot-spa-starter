package com.jlg.app.support.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties("mailgun")
@Data
@Component
public class MailConfigProperties {
  private String apiToken;
  private String apiBaseUrl;
  private String domain;
  private String fromAccount;
}
