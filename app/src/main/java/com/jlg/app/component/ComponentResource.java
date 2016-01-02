package com.jlg.app.component;


import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import org.apache.commons.io.IOUtils;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.StringWriter;

import static java.util.Optional.ofNullable;

@AllArgsConstructor
public class ComponentResource {
  @JsonIgnore
  private Resource resource;

  public String getName() throws IOException {
    return resource.getFile().getName().replace(".html", "").toLowerCase();
  }

  public String getContent() throws IOException {
    StringWriter stringWriter = new StringWriter();
    IOUtils.copy(resource.getInputStream(), stringWriter);
    return ofNullable(stringWriter.toString()).orElse("").replace("\\n", "").replace("\\r", "");
  }

  public boolean isNamed(String name) {
    try {
      return getName().equals(name.toLowerCase());
    } catch (IOException e) {
      throw new ComponentResourceIOException(e);
    }
  }
}
