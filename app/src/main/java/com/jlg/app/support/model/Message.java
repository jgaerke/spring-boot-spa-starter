package com.jlg.app.support.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class Message {
  private String from;
  private String to;
  private String subject;
  private String text;
}
