package com.jlg.app.support.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties("mongo")
@Data
@Component
public class MongoConfigProperties {
  String host;
  String port;
  String database;
  String user;
  String password;
}
