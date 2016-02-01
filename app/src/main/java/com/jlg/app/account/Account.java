package com.jlg.app.account;

import lombok.Builder;
import lombok.Getter;
import lombok.Value;
import lombok.experimental.Wither;
import org.springframework.data.annotation.Id;
import org.springframework.security.core.GrantedAuthority;

import java.util.Date;
import java.util.List;
import java.util.Map;

@Value
@Wither
@Builder
public class Account {
  @Id
  private String id;

  private String email;

  private String password;

  private String first;

  private String last;

  private String plan;

  private Map<String, Object> paymentInfo;

  private Date trialExpirationDate;

  private String passwordResetToken;

  private boolean locked;

  private boolean expired;

  private boolean credentialsExpired;

  private boolean disabled;

  private List<? extends GrantedAuthority> authorities;

}

