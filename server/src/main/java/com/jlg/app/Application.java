package com.jlg.app;

import com.jlg.app.domain.Account;
import com.jlg.app.repository.AccountRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;

import static com.google.common.collect.Lists.newArrayList;
import static java.util.UUID.randomUUID;

@SpringBootApplication
public class Application {
  public static void main(String[] args) {
    ConfigurableApplicationContext ctx = SpringApplication.run(Application.class, args);
    AccountRepository accountRepository = ctx.getBean(AccountRepository.class);
    accountRepository.save(Account.builder()
        .id(randomUUID().toString())
        .email("jgaerke@gmail.com")
        .password("password")
        .credentialsExpired(false)
        .disabled(false)
        .expired(false)
        .first("jeremy")
        .last("gaerke")
        .locked(false)
        .passwordResetToken(null)
        .paymentInfo(null)
        .plan("plan-a")
        .authorities(newArrayList(new SimpleGrantedAuthority("role")))
        .trialExpirationDate(LocalDateTime.now().plusMonths(1))
        .build());
  }
}
