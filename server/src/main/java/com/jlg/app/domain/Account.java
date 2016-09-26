package com.jlg.app.domain;

import lombok.*;
import lombok.experimental.Wither;
import org.springframework.data.annotation.Id;
import org.springframework.security.core.GrantedAuthority;

import java.time.LocalDateTime;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;


@AllArgsConstructor
@NoArgsConstructor(access = PRIVATE)
@Getter
@Builder(toBuilder = true)
@EqualsAndHashCode
@ToString
@Wither
public class Account {

  @Id
  private String id;

  private String email;

  private String password;

  private String first;

  private String last;

  private String plan;

  private String paymentInfo;

  private LocalDateTime trialExpirationDate;

  private String passwordResetToken;

  private boolean locked;

  private boolean expired;

  private boolean credentialsExpired;

  private boolean disabled;

  private List<? extends GrantedAuthority> authorities;
}
