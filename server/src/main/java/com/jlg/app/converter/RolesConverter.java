package com.jlg.app.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jlg.app.domain.Role;

import javax.persistence.AttributeConverter;
import java.io.IOException;
import java.util.Set;


public class RolesConverter implements AttributeConverter<Set<Role>, String> {
  private static ObjectMapper mapper = null;

  @Override
  public String convertToDatabaseColumn(Set<Role> roles) {
    try {
      return mapper.writeValueAsString(roles);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public Set<Role> convertToEntityAttribute(String dbData) {
    try {
      return mapper.readValue(dbData, Set.class);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public static void setObjectMapper(ObjectMapper objectMapper) {
    mapper = objectMapper;
  }
}
