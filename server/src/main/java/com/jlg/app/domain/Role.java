package com.jlg.app.domain;

import lombok.*;
import lombok.experimental.NonFinal;
import lombok.experimental.Wither;
import org.springframework.security.core.GrantedAuthority;

import javax.persistence.Entity;
import javax.persistence.Id;
import java.util.UUID;


@AllArgsConstructor
@Value
@Wither
@Builder
@NonFinal
@EqualsAndHashCode
@ToString
@Entity
public class Role implements GrantedAuthority {

  @Id
  private UUID account;

  @Id
  private String name;

  public Role(String name) {
    this.account = null;
    this.name = name;
  }

  @Override
  public String getAuthority() {
    return name;
  }
}
