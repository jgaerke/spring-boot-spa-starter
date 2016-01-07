package com.jlg.app.support.config;

import com.mongodb.MongoClient;
import com.mongodb.MongoCredential;
import com.mongodb.ServerAddress;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDbFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoDbFactory;

import java.net.UnknownHostException;

import static com.google.common.collect.Lists.newArrayList;
import static java.lang.Integer.valueOf;

@Configuration
public class MongoConfig {

  @Bean
  public MongoClient mongoClient(MongoConfigProperties mongoConfigProperties) throws UnknownHostException {
    ServerAddress serverAddress = new ServerAddress(mongoConfigProperties.getHost(), valueOf(mongoConfigProperties.getPort()));
    MongoCredential mongoCredential = MongoCredential.createCredential(mongoConfigProperties.getUser(), mongoConfigProperties
        .getDatabase(), mongoConfigProperties.getPassword().toCharArray());
    return new MongoClient(serverAddress, newArrayList(mongoCredential));
  }

  @Bean
  public MongoDbFactory mongoDbFactory(MongoConfigProperties mongoConfigProperties) throws UnknownHostException {
    return new SimpleMongoDbFactory(mongoClient(mongoConfigProperties), mongoConfigProperties.getDatabase());
  }

  @Bean
  public MongoTemplate mongoTemplate(MongoConfigProperties mongoConfigProperties) throws UnknownHostException {
    return new MongoTemplate(mongoDbFactory(mongoConfigProperties));
  }
}
