package com.jlg.app;

import com.jlg.app.domain.Account;

import java.util.UUID;

import static com.google.common.collect.Lists.newArrayList;
import static com.google.common.collect.Sets.newHashSet;

public class TestUtil {
  public static Account createValidNewAccount() {
    return Account.builder()
        .id(null)
        .email("some-email@gmail.com")
        .password("password")
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
        .first("jeremy")
        .last("gaerke")
        .credentialsExpired(false)
        .disabled(false)
        .expired(false)
        .locked(false)
        .passwordResetToken(null)
        .build();
  }


  public static Account createValidRegistrationRequest() {
    return Account.builder().email("some-email@gmail.com").password("some-password").build();
  }
}
