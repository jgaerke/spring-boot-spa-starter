package com.jlg.app.support.service;

import retrofit.Call;
import retrofit.http.Field;
import retrofit.http.FormUrlEncoded;
import retrofit.http.POST;
import retrofit.http.Path;


public interface MessageService {
  @FormUrlEncoded
  @POST("/v3/{domain}/messages")
  Call<Void> send(
      @Path("domain") String domain,
      @Field("from") String from,
      @Field("to") String to,
      @Field("subject") String subject,
      @Field("text") String text);
}

