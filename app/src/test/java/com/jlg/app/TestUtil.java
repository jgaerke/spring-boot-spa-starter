package com.jlg.app;

import com.jlg.app.account.Account;
import com.jlg.app.account.request.RegistrationRequest;

import java.util.UUID;

import static com.google.common.collect.Lists.newArrayList;

public class TestUtil {
  public static Account createValidNewAccount() {
    return Account.builder()
        .id(null)
        .email("some-email@gmail.com")
        .password("password")
        .authorities(newArrayList())
        .first("jeremy")
        .last("gaerke")
        .credentialsExpired(false)
        .disabled(false)
        .expired(false)
        .locked(false)
        .passwordResetToken(null)
        .build();
  }

  public static Account createValidExistingAccount() {
    return Account.builder()
        .id(UUID.randomUUID().toString())
        .email("some-email@gmail.com")
        .password("password")
        .authorities(newArrayList())
        .first("jeremy")
        .last("gaerke")
        .credentialsExpired(false)
        .disabled(false)
        .expired(false)
        .locked(false)
        .passwordResetToken(null)
        .build();
  }


  public static RegistrationRequest createValidRegistrationRequest() {
    return new RegistrationRequest("some-email@gmail.com", "some-password");
  }
}
