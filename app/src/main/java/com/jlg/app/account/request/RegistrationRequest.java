package com.jlg.app.account.request;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.jlg.app.account.Account;
import lombok.Getter;
import lombok.experimental.Wither;
import org.hibernate.validator.constraints.NotEmpty;

import javax.validation.constraints.Size;

import static com.google.common.collect.Lists.newArrayList;

@Getter
@Wither
public class RegistrationRequest {
  @NotEmpty
  @Size(max = 254)
  private final String email;

  @NotEmpty
  @Size(max = 254)
  private final String password;

  @JsonCreator
  public RegistrationRequest(
      @JsonProperty("email") String email,
      @JsonProperty("password") String password) {
    this.email = email;
    this.password = password;
  }

  public Account toAccount() {
    return new Account(
        null,
        this.email,
        this.password,
        null,
        null,
        null,
        false,
        false,
        false,
        false,
        newArrayList()
    );
  }
}

