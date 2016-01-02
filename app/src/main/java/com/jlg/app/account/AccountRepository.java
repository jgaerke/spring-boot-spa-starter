package com.jlg.app.account;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AccountRepository extends MongoRepository<Account, String> {
  Optional<Account> findOneByEmail(String email);
  Optional<Account> findOneByPasswordResetToken(String token);
}