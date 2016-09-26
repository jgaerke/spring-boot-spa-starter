package com.jlg.app.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.restassured.RestAssured;
import com.jayway.restassured.response.ExtractableResponse;
import com.jayway.restassured.response.Response;
import com.jlg.app.domain.Account;
import com.jlg.app.repository.AccountRepository;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import java.time.LocalDateTime;
import java.util.UUID;

import static com.google.common.collect.Lists.newArrayList;
import static com.jayway.restassured.RestAssured.given;
import static com.jlg.app.util.SerializationUtil.deserialize;
import static com.jlg.app.util.SerializationUtil.serialize;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;
import static org.springframework.http.HttpStatus.OK;
import static org.springframework.http.MediaType.APPLICATION_JSON_UTF8_VALUE;

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
    Account requestBody = createNewAccount();

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
    assertThat(response.contentType(), equalTo(APPLICATION_JSON_UTF8_VALUE));

    accountRepository.delete(responseBody.getId());
  }


  private Account createNewAccount() {
    return Account.builder()
        .email("jgaerke@gmail.com")
        .password("password")
        .credentialsExpired(false)
        .disabled(false)
        .expired(false)
        .first("jeremy")
        .last("gaerke")
        .locked(false)
        .passwordResetToken(null)
        .paymentInfo(null)
        .plan("plan-a")
        .authorities(newArrayList(new SimpleGrantedAuthority("role")))
        .trialExpirationDate(LocalDateTime.now().plusMonths(1))
        .build();
  }
}