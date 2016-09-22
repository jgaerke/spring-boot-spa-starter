package com.jlg.app.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.restassured.RestAssured;
import com.jayway.restassured.response.ExtractableResponse;
import com.jayway.restassured.response.Response;
import com.jlg.app.domain.Account;
import com.jlg.app.repository.AccountRepository;
import com.jlg.app.util.SerializationUtil;
import com.sun.xml.internal.ws.developer.Serialization;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import java.util.UUID;

import static com.jayway.restassured.RestAssured.given;
import static com.jlg.app.util.SerializationUtil.deserialize;
import static com.jlg.app.util.SerializationUtil.serialize;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.notNullValue;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;
import static org.springframework.http.HttpStatus.OK;
import static org.springframework.http.MediaType.APPLICATION_JSON_UTF8_VALUE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RunWith(SpringJUnit4ClassRunner.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
public class AccountApiContractTest {
  private static final String URL = "/api/accounts";

  @Autowired
  private AccountRepository accountRepository;

  @Autowired
  private ObjectMapper objectMapper;

  @Value("${local.server.port}")
  private int port;

  private UUID masterOrderId;

  @Before
  public void setUp() throws Exception {
    RestAssured.port = port;
  }

  @Test
  public void create_should_succeed_when_all_fields_are_valid() {
    Account requestBody = null;

    ExtractableResponse<Response> response = given()
        .contentType(APPLICATION_JSON_UTF8_VALUE)
        .body(serialize(objectMapper, requestBody))
        .when()
        .post(URL)
        .then()
        .log().all()
        .extract();

    Account responseBody = deserialize(objectMapper, response.body().asString(), Account.class);

    //Want to assert things about the response along with
    //the things that our API is responsible for handling such as
    //time stamps, id creation, and eTag generation.
    assertThat(response.statusCode(), equalTo(OK.value()));
    assertThat(response.contentType(), equalTo(APPLICATION_JSON_VALUE));

    accountRepository.delete(responseBody.getMasterOrderId());
  }



  private Account createNewAccount() {

  }
}