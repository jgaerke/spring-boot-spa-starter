package com.jlg.app.account;

import com.jlg.app.account.exception.AccountEmailConflictException;
import com.jlg.app.account.exception.AccountPrincipalMismatchException;
import com.jlg.app.account.exception.EmailNotFoundException;
import com.jlg.app.account.exception.PasswordResetTokenNotFoundException;
import com.jlg.app.account.request.PasswordChangeRequest;
import com.jlg.app.account.request.PasswordResetRequest;
import com.jlg.app.account.request.RegistrationRequest;
import com.jlg.app.support.exception.MessageSendException;
import com.jlg.app.support.service.MessageService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import retrofit.Call;

import java.security.Principal;

import static com.google.common.collect.Lists.newArrayList;
import static com.jlg.app.TestUtil.createValidExistingAccount;
import static com.squareup.okhttp.MediaType.parse;
import static com.squareup.okhttp.ResponseBody.create;
import static java.util.Optional.empty;
import static java.util.Optional.of;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Matchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static retrofit.Response.error;
import static retrofit.Response.success;

@RunWith(MockitoJUnitRunner.class)
public class AccountServiceTest {

  @Mock
  AccountRepository accountRepository;

  @Mock
  PasswordEncoder passwordEncoder;

  @Mock
  UserDetailsService userDetailsService;

  @Mock
  MessageService messageService;

  @Mock
  Environment environment;

  @Mock
  private Principal principal;

  @Mock
  private Call<Void> call;

  @InjectMocks
  AccountService accountService;

  @Test
  public void should_create_account() throws Exception {
    //given
    when(accountRepository.findOneByEmail(anyString())).thenReturn(empty());
    when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded");

    //when
    accountService.create(new RegistrationRequest("some-email@gmail.com", "password"));

    //then
    ArgumentCaptor<Account> argument = ArgumentCaptor.forClass(Account.class);
    verify(accountRepository).save(argument.capture());
    assertThat(argument.getValue().getPassword(), equalTo("encoded"));
  }

  @Test(expected = AccountEmailConflictException.class)
  public void should_throw_proper_exception_when_email_taken_upon_create() throws Exception {
    //given
    when(accountRepository.findOneByEmail(anyString())).thenReturn(of(createValidExistingAccount()));
    when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded");

    //when
    accountService.create(new RegistrationRequest("some-email@gmail.com", "password"));
  }

  @Test
  public void should_change_password() throws Exception {
    //given
    Account existing = createValidExistingAccount();
    when(accountRepository.findOneByEmail(anyString())).thenReturn(of(existing));
    when(accountRepository.save(any(Account.class))).thenReturn(existing);
    when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded");
    when(userDetailsService.loadUserByUsername(anyString())).thenReturn(new User("some-email@gmail.com", "foo",
        newArrayList()));

    //when
    accountService.changePassword(new PasswordChangeRequest("password"), "some-email@gmail.com");

    //then
    ArgumentCaptor<Account> argument = ArgumentCaptor.forClass(Account.class);
    verify(accountRepository).save(argument.capture());
    assertThat(argument.getValue().getPassword(), equalTo("encoded"));
  }

  @Test(expected = AccountPrincipalMismatchException.class)
  public void should_throw_proper_exception_when_current_principal_does_not_match_account_upon_password_change()
      throws Exception {
    //given
    when(accountRepository.findOneByEmail(anyString())).thenReturn(empty());

    //when
    accountService.changePassword(new PasswordChangeRequest("foo"), "some-email@gmail.com");
  }

  @Test
  public void should_reset_password() throws Exception {
    //given
    Account existing = createValidExistingAccount();
    when(accountRepository.findOneByPasswordResetToken(anyString())).thenReturn(of(existing));
    when(accountRepository.save(any(Account.class))).thenReturn(existing);
    when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded");
    when(userDetailsService.loadUserByUsername(anyString())).thenReturn(new User("some-email@gmail.com", "foo",
        newArrayList()));

    //when
    accountService.resetPassword(new PasswordResetRequest("token", "password"));

    //then
    ArgumentCaptor<Account> argument = ArgumentCaptor.forClass(Account.class);
    verify(accountRepository).save(argument.capture());
    assertThat(argument.getValue().getPassword(), equalTo("encoded"));
    assertThat(argument.getValue().getPasswordResetToken(), equalTo(null));
  }

  @Test(expected = PasswordResetTokenNotFoundException.class)
  public void should_throw_proper_exception_when_token_does_not_match_account_upon_password_reset()
      throws Exception {
    //given
    when(accountRepository.findOneByPasswordResetToken(anyString())).thenReturn(empty());

    //when
    accountService.resetPassword(new PasswordResetRequest("token", "password"));
  }

  @Test
  public void should_recover_password() throws Exception {
    //given
    Account existing = createValidExistingAccount();
    when(accountRepository.findOneByEmail(anyString())).thenReturn(of(existing));
    when(accountRepository.save(any(Account.class))).thenReturn(existing);
    when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded");
    when(userDetailsService.loadUserByUsername(anyString())).thenReturn(new User("some-email@gmail.com", "foo",
        newArrayList()));
    when(messageService.send(anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(call);
    when(call.execute()).thenReturn(success(null));

    //when
    boolean result = accountService.sendPasswordResetInstructions("some-email@gmail.com");

    //then
    assertThat(result, equalTo(true));
  }

  @Test(expected = EmailNotFoundException.class)
  public void should_throw_proper_exception_when_email_does_not_match_account_upon_recover_password()
      throws Exception {
    //given
    when(accountRepository.findOneByEmail(anyString())).thenReturn(empty());

    //when
    accountService.sendPasswordResetInstructions("some-email@gmail.com");
  }

  @Test(expected = MessageSendException.class)
  public void should_throw_proper_exception_when_message_service_returns_error_upon_recover_password() throws
      Exception {
    //given
    Account existing = createValidExistingAccount();
    when(accountRepository.findOneByEmail(anyString())).thenReturn(of(existing));
    when(accountRepository.save(any(Account.class))).thenReturn(existing);
    when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded");
    when(userDetailsService.loadUserByUsername(anyString())).thenReturn(new User("some-email@gmail.com", "foo",
        newArrayList()));
    when(messageService.send(anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(call);
    when(call.execute()).thenReturn(error(400, create(parse("application/json"), "error")));

    //when
    accountService.sendPasswordResetInstructions("some-email@gmail.com");
  }
}