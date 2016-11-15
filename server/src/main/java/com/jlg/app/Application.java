package com.jlg.app;

import com.jlg.app.domain.Account;
import com.jlg.app.repository.AccountRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.StandardPasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static com.google.common.collect.Lists.newArrayList;
import static java.util.UUID.randomUUID;

@SpringBootApplication
@EnableScheduling
public class Application {
  public static void main(String[] args) {
    ConfigurableApplicationContext ctx = SpringApplication.run(Application.class, args);
//    seedData(ctx);
  }

  private static void seedData(ConfigurableApplicationContext ctx) {
    AccountRepository accountRepository = ctx.getBean(AccountRepository.class);
    StandardPasswordEncoder standardPasswordEncoder = ctx.getBean(StandardPasswordEncoder.class);

    Optional<Account> existing = accountRepository.findOneByEmail("jgaerke@gmail.com");
    if(existing.isPresent()) {
      accountRepository.delete(existing.get());
    }
    accountRepository.save(Account.builder()
        .id(randomUUID().toString())
        .email("jgaerke@gmail.com")
        .password(standardPasswordEncoder.encode("password"))
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
