package com.jlg.app.account.response;

import lombok.Value;

@Value(staticConstructor = "of")
public class AccountResponse {
  private String email;
  private String first;
  private String last;
}
