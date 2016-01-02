package com.jlg.app.support.service;

import com.squareup.okhttp.Interceptor;
import com.squareup.okhttp.Request;
import com.squareup.okhttp.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class MailGunTokenInjector implements Interceptor {
  @Value("${mailgun.api.token}")
  String mailGunApiToken;

  @Override public Response intercept(Chain chain) throws IOException {
    Request request = chain.request();
    request = request.newBuilder()
        .header("Authorization", "Basic " + mailGunApiToken)
        .build();
    return chain.proceed(request);
  }
}