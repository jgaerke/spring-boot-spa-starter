package com.jlg.app.domain;

import lombok.*;
import lombok.experimental.NonFinal;
import lombok.experimental.Wither;

@AllArgsConstructor
@Value
@Wither
@Builder
@NonFinal
@EqualsAndHashCode
@ToString
public class PasswordRecoveryValidation {
  private String token;
}

