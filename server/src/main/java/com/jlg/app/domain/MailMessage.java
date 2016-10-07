package com.jlg.app.domain;

import lombok.*;
import lombok.experimental.NonFinal;
import lombok.experimental.Wither;


@AllArgsConstructor
@Value
@NonFinal
@Builder(toBuilder = true)
@EqualsAndHashCode
@ToString
@Wither
public class MailMessage {
  private String from;
  private String to;
  private String subject;
  private String text;
}
