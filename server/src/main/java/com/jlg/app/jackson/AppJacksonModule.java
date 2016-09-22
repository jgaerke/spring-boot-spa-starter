package com.jlg.app.jackson;

import com.fasterxml.jackson.databind.module.SimpleModule;
import com.kroger.dcp.ecom.clicklist.masterorder.domain.StoreId;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class AppJacksonModule extends SimpleModule {
  private static final long serialVersionUID = 20151021L;

  public AppJacksonModule() {
    addDeserializer(LocalDate.class, new LocalDateDeserializer());
    addDeserializer(LocalDateTime.class, new LocalDateTimeDeserializer());
    addDeserializer(LocalTime.class, new LocalTimeDeserializer());
    addDeserializer(StoreId.class, new StoreIdDeserializer());
    addSerializer(LocalDate.class, new LocalDateSerializer());
    addSerializer(LocalDateTime.class, new LocalDateTimeSerializer());
    addSerializer(LocalTime.class, new LocalTimeSerializer());
    addSerializer(StoreId.class, new StoreIdSerializer());
  }
}
