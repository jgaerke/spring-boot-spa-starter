package com.jlg.app.account;

import com.jlg.app.account.exception.EmailNotFoundException;
import com.jlg.app.account.request.*;
import com.jlg.app.account.response.AccountResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.security.Principal;
import java.util.Optional;

import static org.springframework.http.HttpStatus.OK;
import static org.springframework.web.bind.annotation.RequestMethod.*;

@RestController
@RequestMapping(value = "/api/accounts")
public class AccountController {

  private final AccountService accountService;
  private final UserDetailsService userDetailsService;

  @Autowired
  public AccountController(
      AccountService accountService,
      UserDetailsService userDetailsService) {
    this.accountService = accountService;
    this.userDetailsService = userDetailsService;
  }

  @RequestMapping(method = POST)
  @ResponseStatus(OK)
  public void create(@Valid @RequestBody RegistrationRequest registrationRequest) {
    setAuthToken(accountService.create(registrationRequest));
  }

  @RequestMapping(value = "/password/change", method = PATCH)
  @ResponseStatus(OK)
  public void changePassword(
      @Valid @RequestBody PasswordChangeRequest passwordChangeRequest, HttpServletRequest request) {
    accountService.changePassword(passwordChangeRequest, request.getUserPrincipal().getName());
  }

  @RequestMapping(value = "/password/reset", method = POST)
  @ResponseStatus(OK)
  public void resetPassword(@Valid @RequestBody PasswordResetRequest passwordResetRequest) {
    accountService.resetPassword(passwordResetRequest);
  }

  @RequestMapping(value = "/password/recover", method = POST)
  @ResponseStatus(OK)
  public void recoverPassword(@Valid @RequestBody PasswordRecoveryRequest passwordRecoveryRequest) {
    accountService.sendPasswordResetInstructions(passwordRecoveryRequest.getEmail());
  }

  @RequestMapping(value = "/current", method = GET)
  @ResponseStatus(OK)
  public AccountResponse getCurrent(HttpServletRequest request) {
    Optional<Account> current = accountService.getByEmail(request.getUserPrincipal().getName());
    if (!current.isPresent()) {
      throw new EmailNotFoundException();
    }
    Account account = current.get();
    return AccountResponse.of(account.getEmail(), account.getFirst(), account.getLast());
  }

  @RequestMapping(method = PATCH)
  @ResponseStatus(OK)
  public void update(@Valid @RequestBody AccountUpdateRequest accountUpdateRequest, HttpServletRequest request) {
    Account updated = accountService.update(request.getUserPrincipal().getName(), accountUpdateRequest);
    setAuthToken(updated);
  }

  private void setAuthToken(Account account) {
    UserDetails userDetails = userDetailsService.loadUserByUsername(account.getEmail());
    UsernamePasswordAuthenticationToken auth =
        new UsernamePasswordAuthenticationToken(userDetails, account.getPassword(), userDetails.getAuthorities());
    SecurityContextHolder.getContext().setAuthentication(auth);
  }
}
