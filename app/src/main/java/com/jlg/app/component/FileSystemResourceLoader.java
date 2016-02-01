package com.jlg.app.component;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ResourceLoader;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.util.List;

import static java.util.Arrays.asList;
import static java.util.stream.Collectors.toList;

public class FileSystemResourceLoader implements ComponentResourceLoader {

  private final PathMatchingResourcePatternResolver resourcePatternResolver;

  @Autowired
  public FileSystemResourceLoader(ResourceLoader resourceLoader) {
    this.resourcePatternResolver = new PathMatchingResourcePatternResolver(resourceLoader);
  }

  @Override
  public List<ComponentResource> loadAll() {
    try {
      String pattern = "file://" + new File(".").getCanonicalPath().replace("/app", "") +
          "/app/**/resources/static/js/components/**/*.html";
      return asList(resourcePatternResolver.getResources(pattern))
          .stream().map(r -> new ComponentResource(r)).collect(toList());
    } catch (IOException e) {
      throw new ComponentResourceIOException(e);
    }
  }
}
