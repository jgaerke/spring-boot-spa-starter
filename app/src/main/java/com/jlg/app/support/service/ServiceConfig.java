package com.jlg.app.support.service;

import com.jlg.app.support.config.MailConfigProperties;
import com.squareup.okhttp.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import retrofit.Retrofit;


@Configuration
public class ServiceConfig {

  @Bean
  public OkHttpClient mailGunOkHttpClient(MailGunTokenInjector mailGunTokenInjector) {
    OkHttpClient okHttpClient = new OkHttpClient();
    okHttpClient.interceptors().add(mailGunTokenInjector);
    return okHttpClient;
  }


  @Bean
  public MessageService messageService(OkHttpClient mailGunOkHttpClient, MailConfigProperties mailConfigProperties) {
    Retrofit retrofit = new Retrofit.Builder()
        .baseUrl(mailConfigProperties.getApiBaseUrl())
        .client(mailGunOkHttpClient)
//        .addConverterFactory(JacksonConverterFactory.create())
        .build();
    return retrofit.create(MessageService.class);
  }
}