package com.jlg.app.support.service;

import com.squareup.okhttp.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import retrofit.JacksonConverterFactory;
import retrofit.Retrofit;


@Configuration
public class ServiceConfig {

  @Bean
  public OkHttpClient mailGunOkHttpClient(MailGunTokenInjector mailGunTokenInjector) {
    OkHttpClient okHttpClient = new OkHttpClient();
    okHttpClient.interceptors().add(mailGunTokenInjector);
    return okHttpClient;
  }

  @Value("${mailgun.api.base.url}")
  String mailgunApiBaseUrl;

  @Bean
  public MessageService messageService(OkHttpClient mailGunOkHttpClient) {
    Retrofit retrofit = new Retrofit.Builder()
        .baseUrl(mailgunApiBaseUrl)
        .client(mailGunOkHttpClient)
//        .addConverterFactory(JacksonConverterFactory.create())
        .build();
    return retrofit.create(MessageService.class);
  }
}