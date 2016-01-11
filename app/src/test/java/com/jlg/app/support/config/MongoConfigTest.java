package com.jlg.app.support.config;

import com.mongodb.DB;
import com.mongodb.MongoClient;
import com.mongodb.MongoCredential;
import com.mongodb.ServerAddress;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.runners.MockitoJUnitRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoDbFactory;

import java.util.List;

import static org.junit.Assert.assertEquals;

@RunWith(MockitoJUnitRunner.class)
public class MongoConfigTest {
  MongoConfig mongoConfig;
  MongoConfigProperties mongoConfigProperties;

  @Before
  public void setup() {
    mongoConfig = new MongoConfig();

    mongoConfigProperties = new MongoConfigProperties();
    mongoConfigProperties.setHost("localhost");
    mongoConfigProperties.setDatabase("db");
    mongoConfigProperties.setPort("10001");
    mongoConfigProperties.setUser("user");
    mongoConfigProperties.setPassword("password");
  }

  @Test
  public void mongo_client_should_be_configured_properly() throws Exception {
    //when
    MongoClient mongoClient = mongoConfig.mongoClient(mongoConfigProperties);
    ServerAddress address = mongoClient.getAddress();
    List<MongoCredential> credentialsList = mongoClient.getCredentialsList();

    //then
    assertEquals("Should use specified host", "localhost", address.getHost());
    assertEquals("Should use specified port", 10001, address.getPort());
    assertEquals("Should use specified db", "db", credentialsList.get(0).getSource());
    assertEquals("Should use specified user name", "user", credentialsList.get(0).getUserName());
    assertEquals("Should use specified user name", "password", new String(credentialsList.get(0).getPassword()));
  }

  @Test
  public void mongo_db_factory_should_return_expected_db() throws Exception {
    //when
    SimpleMongoDbFactory mongoDbFactory = (SimpleMongoDbFactory) mongoConfig.mongoDbFactory(mongoConfigProperties);
    DB db = mongoDbFactory.getDb();

    //then
    assertEquals("Should use specified db", "db", db.getName());
  }

  @Test
  public void mongo_template_should_return_expected_db() throws Exception {
    //when
    MongoTemplate mongoTemplate = mongoConfig.mongoTemplate(mongoConfigProperties);
    DB db = mongoTemplate.getDb();

    //then
    assertEquals("Should use specified db", "db", db.getName());
  }
}