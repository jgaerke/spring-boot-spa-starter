package com.jlg.app.controller;

import com.jlg.app.domain.Account;
import com.jlg.app.domain.PasswordChange;
import com.jlg.app.domain.PasswordRecovery;
import com.jlg.app.domain.PasswordReset;
import com.jlg.app.service.AccountService;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;

import javax.servlet.http.HttpServletRequest;
import java.security.Principal;

import static com.google.common.collect.Lists.newArrayList;
import static com.jlg.app.TestUtil.createValidExistingAccount;
import static org.mockito.Matchers.anyString;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class AccountControllerTest {

  @Mock
  AccountService accountService;

  @Mock
  UserDetailsService userDetailsService;

  @Mock
  private HttpServletRequest request;

  @InjectMocks
  AccountController accountController;

  @Before
  public void setup() {
    when(userDetailsService.loadUserByUsername(anyString())).thenReturn(new User("some-email@gmail.com", "password",
        newArrayList()));
  }

  @Test
  public void should_create_account() throws Exception {
    //given
    when(accountService.create(any(Account.class))).thenReturn(createValidExistingAccount());
    Account registrationRequest = Account.builder().email("some-email@gmail.com").password("password").build();
    //when
    accountController.create(registrationRequest);
    //then
    verify(accountService).create(eq(registrationRequest));
  }

  @Test
  public void should_change_password() throws Exception {
    //given
    when(accountService.changePassword(any(PasswordChange.class), anyString())).thenReturn
        (createValidExistingAccount());
    Principal principal = mock(Principal.class);
    when(principal.getName()).thenReturn("some-email@gmail.com");
    when(request.getUserPrincipal()).thenReturn(principal);
    PasswordChange passwordChange = new PasswordChange("password");
    //when
    accountController.changePassword(passwordChange, request);
    //then
    verify(accountService).changePassword(eq(passwordChange), eq("some-email@gmail.com"));
  }

  @Test
  public void should_reset_password() throws Exception {
    //given
    when(accountService.resetPassword(any(PasswordReset.class))).thenReturn
        (createValidExistingAccount());
    PasswordReset passwordReset = new PasswordReset("token", "password");
    //when
    accountController.resetPassword(passwordReset);
    //then
    verify(accountService).resetPassword(eq(passwordReset));
  }

  @Test
  public void should_recover_password() throws Exception {
    //given
    when(accountService.resetPassword(any(PasswordReset.class))).thenReturn
        (createValidExistingAccount());
    PasswordRecovery passwordRecovery = new PasswordRecovery("some-email@gmail.com");
    //when
    accountController.recoverPassword(passwordRecovery);
    //then
    verify(accountService).sendPasswordResetInstructions(eq("some-email@gmail.com"));
  }
}