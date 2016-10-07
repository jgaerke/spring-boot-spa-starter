package com.jlg.app.service;

import com.jlg.app.domain.Account;
import com.jlg.app.domain.MailMessage;
import com.jlg.app.exception.AccountEmailConflictException;
import com.jlg.app.exception.AccountPrincipalMismatchException;
import com.jlg.app.exception.EmailNotFoundException;
import com.jlg.app.exception.PasswordResetTokenNotFoundException;
import com.jlg.app.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

import static java.lang.String.format;
import static java.lang.System.getProperty;

@Service
public class AccountService {
  private final AccountRepository accountRepository;
  private final MailService mailService;
  private PasswordEncoder passwordEncoder;

  @Autowired
  public AccountService(
      UserDetailsService userDetailsService,
      AccountRepository accountRepository,
      PasswordEncoder passwordEncoder,
      MailService mailService) {
    this.accountRepository = accountRepository;
    this.passwordEncoder = passwordEncoder;
    this.mailService = mailService;
  }

  public Account create(Account account) {
    if (accountRepository.findOneByEmail(account.getEmail()).isPresent()) {
      throw new AccountEmailConflictException();
    }
    return accountRepository.save(account
        .withPassword(passwordEncoder.encode(account.getPassword())));
  }

  public Account update(String existingEmail, Account account) {
    Optional<Account> existing = accountRepository.findOneByEmail(existingEmail);
    if (!existing.isPresent()) {
      throw new EmailNotFoundException();
    }
    return accountRepository.save(account);
  }

  public Account changePassword(Account passwordChange, String email) {
    Optional<Account> account = accountRepository.findOneByEmail(email);
    if (!account.isPresent()) {
      throw new AccountPrincipalMismatchException();
    }
    return accountRepository.save(account.get().withPassword(passwordEncoder.encode(passwordChange.getPassword())));
  }

  public Account resetPassword(Account passwordReset) {
    Optional<Account> account =
        accountRepository.findOneByPasswordResetToken(passwordReset.getPasswordResetToken());
    if (!account.isPresent()) {
      throw new PasswordResetTokenNotFoundException();
    }
    return accountRepository.save(
        account.get()
            .withPassword(passwordEncoder.encode(passwordReset.getPassword()))
            .withPasswordResetToken(null)
    );
  }

  public boolean sendPasswordResetInstructions(String email) {
    Optional<Account> account = accountRepository.findOneByEmail(email);
    if (!account.isPresent()) {
      throw new EmailNotFoundException();
    }

    String passwordResetToken = UUID.randomUUID().toString();

    accountRepository.save(account.get().withPasswordResetToken(passwordResetToken));

    mailService.send(new MailMessage(
        "some-email.com", //TODO:: fix this.
        email,
        "Password Reset",
        format(
            "Please click the following link to reset your password: %s" +
                "http://localhost:8080/app/reset-password/%s",
            getProperty("line.separator"),
            passwordResetToken
        )
    ));

    return true;
  }

  public Optional<Account> getByEmail(String email) {
    return accountRepository.findOneByEmail(email);
  }
}
