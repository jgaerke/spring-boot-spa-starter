package com.jlg.app.domain;

import lombok.*;
import lombok.experimental.NonFinal;
import lombok.experimental.Wither;
import org.springframework.security.core.GrantedAuthority;


@AllArgsConstructor
@Value
@Wither
@Builder
@NonFinal
@EqualsAndHashCode
@ToString
public class Role implements GrantedAuthority {
  private String name;

  @Override
  public String getAuthority() {
    return name;
  }
}
