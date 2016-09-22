package com.jlg.app.service;

import com.jlg.app.domain.MailMessage;

public interface MailService {
  void send(MailMessage message);
}
