package com.jlg.app.account.request;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.jlg.app.account.Account;
import lombok.Getter;
import lombok.experimental.Wither;
import org.hibernate.validator.constraints.NotEmpty;

import javax.validation.constraints.Size;

import static com.google.common.base.Strings.isNullOrEmpty;

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

  @Size(max = 10)
  private final String plan;

  @JsonCreator
  public AccountUpdateRequest(
      @JsonProperty("email") String email,
      @JsonProperty("first") String first,
      @JsonProperty("last") String last,
      @JsonProperty("plan") String plan) {
    this.email = email;
    this.first = first;
    this.last = last;
    this.plan = plan;
  }

  public Account copyToAccount(Account account) {
    return account
        .withEmail(nullIfEmpty(email))
        .withFirst(nullIfEmpty(first))
        .withLast(nullIfEmpty(last))
        .withPlan(plan);
  }

  private String nullIfEmpty(String value) {
    if(isNullOrEmpty(value)) {
      return null;
    }
    return value;
  }
}

