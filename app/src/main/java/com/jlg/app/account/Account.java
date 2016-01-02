package com.jlg.app.account;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.Wither;
import org.springframework.data.annotation.Id;
import org.springframework.security.core.GrantedAuthority;

import java.util.List;
import java.util.UUID;

@Getter
@Wither
@Builder
@AllArgsConstructor
public class Account {
  @Id
  private final String id;

  private final String email;

  private final String password;

  private final String first;

  private final String last;

  private final String passwordResetToken;

  private final boolean locked;

  private final boolean expired;

  private final boolean credentialsExpired;

  private final boolean disabled;

  private final List<? extends GrantedAuthority> authorities;

}

