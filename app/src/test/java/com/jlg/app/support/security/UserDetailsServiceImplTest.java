package com.jlg.app.support.security;

import com.jlg.app.account.Account;
import com.jlg.app.account.AccountRepository;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.runners.MockitoJUnitRunner;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static com.google.common.collect.Lists.newArrayList;
import static java.util.Optional.of;
import static org.junit.Assert.assertEquals;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class UserDetailsServiceImplTest {

  @Test
  public void testLoadUserByUsername() throws Exception {
    //given
    String email = "some-email@gmail.com";
    String password = "password";
    String role = "role";
    List authorities = new ArrayList<>();
    authorities.add(new SimpleGrantedAuthority(role));
    Account account = Account.builder()
        .email(email)
        .password(password)
        .authorities(authorities)
        .build();
    AccountRepository mockAccountRepository = mock(AccountRepository.class);
    when(mockAccountRepository.findOneByEmail(eq(email))).thenReturn(of(account));
    UserDetailsServiceImpl userDetailsService = new UserDetailsServiceImpl(mockAccountRepository);

    //when
    UserDetails userDetails = userDetailsService.loadUserByUsername(email);

    //then
    assertEquals("User name should be email value supplied", email, userDetails.getUsername());
    assertEquals("Password should be value supplied", password, userDetails.getPassword());
    assertEquals("Role should be value supplied", role, newArrayList(userDetails.getAuthorities()).get(0).getAuthority());
    verify(mockAccountRepository).findOneByEmail(eq(email));
  }

  @Test(expected = UsernameNotFoundException.class)
  public void testThatLoadUserByUsernameThrowsExceptionWhenEmailNotFound() throws Exception {
    //given
    AccountRepository mockAccountRepository = mock(AccountRepository.class);
    when(mockAccountRepository.findOneByEmail(anyString())).thenReturn(Optional.empty());
    UserDetailsServiceImpl userDetailsService = new UserDetailsServiceImpl(mockAccountRepository);

    //when
    userDetailsService.loadUserByUsername("some-email@gmail.com");
  }
}