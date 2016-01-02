package com.jlg.app.component;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static java.util.stream.Collectors.toList;
import static org.springframework.http.HttpStatus.OK;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class ComponentController {
  private final ComponentResourceLoader componentResourceLoader;

  @Autowired
  public ComponentController(ComponentResourceLoader componentResourceLoader) {
    this.componentResourceLoader = componentResourceLoader;
  }

  @RequestMapping(value = "/components/content", produces = APPLICATION_JSON_VALUE)
  public ResponseEntity<List<ComponentResource>> getComponentContent(
      @RequestParam(value = "names", required = true, defaultValue = "") List<String> names
  ) {
    List<ComponentResource> all = componentResourceLoader.loadAll();
    List<ComponentResource> matches = names.stream().map(n -> getComponentByName(n, all)).collect(toList());
    return new ResponseEntity<>(matches, OK);
  }

  private ComponentResource getComponentByName(String name, List<ComponentResource> componentResources) {
    return componentResources.stream()
        .filter(c -> c.isNamed(name.replace("-", "")))
        .findFirst()
        .orElseThrow(() -> new ComponentNotFoundException(name));
  }
}
