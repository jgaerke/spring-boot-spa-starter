package com.jlg.app.account;

import com.jlg.app.account.exception.AccountEmailConflictException;
import com.jlg.app.account.exception.AccountPrincipalMismatchException;
import com.jlg.app.account.exception.EmailNotFoundException;
import com.jlg.app.account.exception.PasswordResetTokenNotFoundException;
import com.jlg.app.account.request.PasswordChangeRequest;
import com.jlg.app.account.request.PasswordRecoveryRequest;
import com.jlg.app.account.request.PasswordResetRequest;
import com.jlg.app.account.request.RegistrationRequest;
import com.jlg.app.support.exception.MessageSendException;
import com.jlg.app.support.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;
import retrofit.Call;
import retrofit.Response;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static java.lang.Integer.valueOf;
import static java.lang.String.format;
import static java.lang.System.getProperty;
import static org.springframework.http.ResponseEntity.ok;

@Service
public class AccountService {
  private final UserDetailsService userDetailsService;
  private final AccountRepository accountRepository;
  private PasswordEncoder passwordEncoder;
  private final MessageService messageService;
  private final Environment environment;

  @Autowired
  public AccountService(
      UserDetailsService userDetailsService,
      AccountRepository accountRepository,
      PasswordEncoder passwordEncoder,
      MessageService messageService,
      Environment environment) {
    this.userDetailsService = userDetailsService;
    this.accountRepository = accountRepository;
    this.passwordEncoder = passwordEncoder;
    this.messageService = messageService;
    this.environment = environment;
  }

  public Account create(RegistrationRequest registrationRequest) {
    if (accountRepository.findOneByEmail(registrationRequest.getEmail()).isPresent()) {
      throw new AccountEmailConflictException();
    }

    return accountRepository.save(
        registrationRequest.withPassword(
            passwordEncoder.encode(registrationRequest.getPassword())
        ).toAccount()
    );
  }

  public Account changePassword(PasswordChangeRequest passwordChangeRequest, String email) {
    Optional<Account> account = accountRepository.findOneByEmail(email);
    if (!account.isPresent()) {
      throw new AccountPrincipalMismatchException();
    }

    return accountRepository.save(
        account.get().withPassword(passwordEncoder.encode(passwordChangeRequest.getPassword()))
    );
  }

  public Account resetPassword(PasswordResetRequest passwordResetRequest) {

    Optional<Account> account =
        accountRepository.findOneByPasswordResetToken(passwordResetRequest.getPasswordResetToken());
    if (!account.isPresent()) {
      throw new PasswordResetTokenNotFoundException();
    }

    return accountRepository.save(
        account.get()
            .withPassword(passwordEncoder.encode(passwordResetRequest.getPassword()))
            .withPasswordResetToken(null)
    );

  }

  public boolean sendPasswordResetInstructions(String email) {
    String domain = environment.getProperty("mailgun.domain");
    String from = environment.getProperty("mailgun.from.account");
    Optional<Account> account = accountRepository.findOneByEmail(email);
    if (!account.isPresent()) {
      throw new EmailNotFoundException();
    }

    String passwordResetToken = UUID.randomUUID().toString();

    accountRepository.save(account.get().withPasswordResetToken(passwordResetToken));

    Call<Void> messageCall = messageService.send(
        domain,
        from,
        email,
        "Password Reset",
        format(
            "Please click the following link to reset your password: %s" +
                "http://localhost:8080/app/reset-password/%s",
            getProperty("line.separator"),
            passwordResetToken
        )
    );

    Response<Void> response = null;
    try {
      response = messageCall.execute();
    } catch (IOException e) {
      throw new MessageSendException(e);
    }

    if (!valueOf(response.code()).toString().startsWith("2")) {
      try {
        throw new MessageSendException(response.code(), response.errorBody().string());
      } catch (IOException e) {
        throw new MessageSendException(e);
      }
    }

    return true;
  }
}
