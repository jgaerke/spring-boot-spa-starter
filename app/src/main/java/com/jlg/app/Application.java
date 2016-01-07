package com.jlg.app;

import com.google.common.collect.Lists;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.List;
import java.util.Map;

import static com.google.common.base.Strings.isNullOrEmpty;
import static java.util.stream.Collectors.toList;

@SpringBootApplication
@Controller
public class Application {

  @RequestMapping("/app")
  public String app() {
    return "app";
  }

  public static void main(String[] args) {
    if(!isEnvironmentConfigured()) {
      return;
    }
    SpringApplication.run(Application.class, args);
  }


  private static boolean isEnvironmentConfigured() {
    List<String> missingProperties = getMissingEnvironment();
    if (!missingProperties.isEmpty()) {
      System.err.println("The following are required properties and must be set:");
      missingProperties.forEach(System.err::println);
      return false;
    }
    return true;
  }

  private static List<String> getMissingEnvironment() {
    Map<String, String> environment = System.getenv();
    List<String> requiredVars = Lists.newArrayList(
        "SERVER_DB_IP_ADDRESS",
        "DB_NAME",
        "DB_USER_NAME",
        "DB_USER_PASSWORD",
        "MAILGUN_API_TOKEN",
        "MAILGUN_API_BASE_URL",
        "MAILGUN_DOMAIN",
        "MAILGUN_FROM_ACCOUNT"
    );
    return requiredVars.stream()
        .filter(v -> !environment.containsKey(v) || isNullOrEmpty(environment.get(v)))
        .collect(toList());
  }
}
