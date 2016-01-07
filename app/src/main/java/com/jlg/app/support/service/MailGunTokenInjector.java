package com.jlg.app.support.service;

import com.jlg.app.support.config.MailConfigProperties;
import com.squareup.okhttp.Interceptor;
import com.squareup.okhttp.Request;
import com.squareup.okhttp.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class MailGunTokenInjector implements Interceptor {
  private final MailConfigProperties mailProperties;

  @Autowired
  public MailGunTokenInjector(MailConfigProperties mailProperties) {
    this.mailProperties = mailProperties;
  }

  @Override public Response intercept(Chain chain) throws IOException {
    Request request = chain.request();
    request = request.newBuilder()
        .header("Authorization", "Basic " + mailProperties.getApiToken())
        .build();
    return chain.proceed(request);
  }
}