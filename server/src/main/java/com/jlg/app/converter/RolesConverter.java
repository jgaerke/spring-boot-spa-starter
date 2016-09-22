package com.jlg.app.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jlg.app.domain.Role;

import javax.persistence.AttributeConverter;
import java.io.IOException;
import java.util.Set;

import static com.jlg.app.util.StaticRefUtil.getRef;


public class RolesConverter implements AttributeConverter<Set<Role>, String> {
  @Override
  public String convertToDatabaseColumn(Set<Role> roles) {
    try {
      return getRef(ObjectMapper.class).writeValueAsString(roles);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(e);
    }
  }

  @SuppressWarnings("unchecked")
  @Override
  public Set<Role> convertToEntityAttribute(String dbData) {
    try {
      return getRef(ObjectMapper.class).readValue(dbData, getRef(ObjectMapper.class).getTypeFactory()
          .constructCollectionType(Set.class, Role.class));
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

}
