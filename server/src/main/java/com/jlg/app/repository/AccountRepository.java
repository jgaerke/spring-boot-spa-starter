package com.jlg.app.repository;

import com.jlg.app.domain.Account;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AccountRepository extends MongoRepository<Account, String> {
  Optional<Account> findOneByEmail(String email);

  Optional<Account> findOneByPasswordResetToken(String passwordResetToken);
}