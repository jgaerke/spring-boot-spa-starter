package com.jlg.app.domain;

import com.jlg.app.validation.group.*;
import lombok.*;
import lombok.experimental.NonFinal;
import lombok.experimental.Wither;
import org.hibernate.validator.constraints.Email;
import org.hibernate.validator.constraints.NotEmpty;
import org.springframework.data.annotation.Id;
import org.springframework.security.core.GrantedAuthority;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@AllArgsConstructor
@Value
@NonFinal
@Builder(toBuilder = true)
@EqualsAndHashCode
@ToString
@Wither
public class Account {

  @Id
  private String id;

  @NotEmpty(groups = {AccountCreation.class, AccountUpdate.class, PasswordRecovery.class})
  @Email(groups = {AccountCreation.class, AccountUpdate.class, PasswordRecovery.class})
  private String email;

  @NotEmpty(groups = {AccountCreation.class, AccountUpdate.class, PasswordReset.class, PasswordChange.class})
  private String password;

  @Size(max = 255)
  private String first;

  @Size(max = 255)
  private String last;

  @Size(max = 55)
  private String plan;

  private Map<String, Object> paymentInfo;

  private LocalDateTime trialExpirationDate;

  @NotNull(groups = PasswordReset.class)
  private String passwordResetToken;

  private Boolean locked;

  private Boolean expired;

  private Boolean credentialsExpired;

  private Boolean disabled;

  private List<? extends GrantedAuthority> authorities;
}
