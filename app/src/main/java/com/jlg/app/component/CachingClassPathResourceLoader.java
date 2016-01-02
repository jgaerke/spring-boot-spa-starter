package com.jlg.app.component;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ResourceLoader;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.util.List;

import static java.util.Arrays.asList;
import static java.util.stream.Collectors.toList;

public class CachingClassPathResourceLoader implements ComponentResourceLoader {

  private final PathMatchingResourcePatternResolver resourcePatternResolver;
  private static List<ComponentResource> localComponentResourceCache = null;

  @Autowired
  public CachingClassPathResourceLoader(ResourceLoader resourceLoader) {
    this.resourcePatternResolver = new PathMatchingResourcePatternResolver(resourceLoader);
  }

  @Override
  public List<ComponentResource> loadAll() {
    try {
      String pattern = "classpath:static/js/components/**/*";
      if (localComponentResourceCache == null) {
        localComponentResourceCache = asList(resourcePatternResolver.getResources(pattern))
            .stream().map(ComponentResource::new).collect(toList());
      }
      return localComponentResourceCache;
    } catch (IOException e) {
      throw new ComponentResourceIOException(e);
    }
  }
}
