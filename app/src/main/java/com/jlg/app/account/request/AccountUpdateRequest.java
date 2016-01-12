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
public class AccountUpdateRequest {
  @NotEmpty
  @Size(max = 254)
  private final String email;

  @Size(max = 254)
  private final String first;

  @Size(max = 254)
  private final String last;

  @JsonCreator
  public AccountUpdateRequest(
      @JsonProperty("email") String email,
      @JsonProperty("first") String first,
      @JsonProperty("last") String last) {
    this.email = email;
    this.first = first;
    this.last = last;
  }

  public Account copyToAccount(Account account) {
    return account.withEmail(email).withFirst(first).withLast(last);
  }
}

