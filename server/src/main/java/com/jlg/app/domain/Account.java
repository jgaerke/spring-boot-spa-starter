package com.jlg.app.domain;

import com.jlg.app.converter.RolesConverter;
import lombok.*;
import lombok.experimental.Wither;

import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.Id;
import java.time.LocalDateTime;
import java.util.Set;

import static java.util.UUID.randomUUID;
import static lombok.AccessLevel.PRIVATE;


@AllArgsConstructor
@NoArgsConstructor(access = PRIVATE)
@Getter
@Builder(toBuilder = true)
@EqualsAndHashCode
@ToString
@Wither
@Entity
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

  @Convert(converter = RolesConverter.class)
  private Set<Role> roles;

  public Account withGeneratedId() {
    return this.toBuilder().id(randomUUID().toString()).build();
  }


}

