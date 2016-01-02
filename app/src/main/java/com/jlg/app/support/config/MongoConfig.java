package com.jlg.app.support.config;

import com.mongodb.MongoClient;
import com.mongodb.MongoCredential;
import com.mongodb.ServerAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDbFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoDbFactory;

import java.net.UnknownHostException;

import static com.google.common.collect.Lists.newArrayList;

@Configuration
public class MongoConfig {

  @Value("${mongo.host}")
  String host;

  @Value("${mongo.port}")
  int port;

  @Value("${mongo.database}")
  String database;

  @Value("${mongo.user}")
  String user;

  @Value("${mongo.password}")
  String password;

  @Bean
  public MongoClient mongoClient() throws UnknownHostException {
    ServerAddress serverAddress = new ServerAddress(host, port);
    MongoCredential mongoCredential = MongoCredential.createCredential(user, database, password.toCharArray());
    return new MongoClient(serverAddress, newArrayList(mongoCredential));
  }

  @Bean
  public MongoDbFactory mongoDbFactory() throws UnknownHostException {
    return new SimpleMongoDbFactory(mongoClient(), database);
  }

  @Bean
  public MongoTemplate mongoTemplate() throws UnknownHostException {
    return new MongoTemplate(mongoDbFactory());
  }
}
