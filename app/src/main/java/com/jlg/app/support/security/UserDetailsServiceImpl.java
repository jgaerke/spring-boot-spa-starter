package com.jlg.app.support.security;

import com.jlg.app.account.Account;
import com.jlg.app.account.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

import static com.google.common.collect.Lists.newArrayList;
import static java.lang.String.format;
import static java.util.Optional.ofNullable;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

  private final AccountRepository accountRepository;

  @Autowired
  public UserDetailsServiceImpl(AccountRepository accountRepository) {
    this.accountRepository = accountRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    Account account = accountRepository
        .findOneByEmail(username)
        .orElseThrow(() -> new UsernameNotFoundException(
            format("Email %s was not found.", username)
        ));
    return new User(
        account.getEmail(),
        account.getPassword(),
        ofNullable(account.getAuthorities()).orElse(newArrayList())
    );
  }
}
