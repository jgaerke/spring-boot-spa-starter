package com.jlg.app.account.response;

import lombok.Builder;
import lombok.Value;

import java.util.Date;

@Value
@Builder
public class AccountResponse {
  private String email;
  private String first;
  private String last;
  private String plan;
  private Date trialExpirationDate;
}
