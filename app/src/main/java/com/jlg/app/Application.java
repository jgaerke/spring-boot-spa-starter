package com.jlg.app;

import com.google.common.base.Strings;
import com.google.common.collect.Lists;
import com.jlg.app.support.config.MailConfigProperties;
import com.jlg.app.support.config.MongoConfigProperties;
import com.jlg.app.support.security.SecurityConfigProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;
import java.util.Map;

import static com.google.common.base.Strings.isNullOrEmpty;
import static java.util.stream.Collectors.toList;
import static org.apache.commons.lang.StringUtils.join;

@SpringBootApplication
@Controller
public class Application {

  @RequestMapping("/app")
  public String app() {
    return "app";
  }

  public static void main(String[] args) {
    if (!isEnvironmentConfigured()) {
      return;
    }
    ConfigurableApplicationContext applicationContext = SpringApplication.run(Application.class, args);
    printApplicationProperties(applicationContext);
  }


  private static boolean isEnvironmentConfigured() {
    List<String> missingProperties = getMissingEnvironment();
    if (!missingProperties.isEmpty()) {
      System.out.println("The following are required properties and must be set:");
      missingProperties.forEach(System.out::println);
      return false;
    }
    return true;
  }

  private static List<String> getMissingEnvironment() {
    Map<String, String> environment = System.getenv();
    List<String> requiredVars = getRequiredVars();
    return requiredVars.stream()
        .filter(v -> !environment.containsKey(v) || isNullOrEmpty(environment.get(v)))
        .collect(toList());
  }

  private static List<String> getRequiredVars() {
    return Lists.newArrayList(
        "ENVIRONMENT_NAME",
        "SECURITY_PERSISTENT_LOGIN_KEY",
        "DB_NAME",
        "DB_USER_NAME",
        "DB_USER_PASSWORD",
        "MAILGUN_API_TOKEN",
        "MAILGUN_API_BASE_URL",
        "MAILGUN_DOMAIN",
        "MAILGUN_FROM_ACCOUNT"
    );
  }

  private static void printApplicationProperties(ApplicationContext applicationContext) {
    System.out.println();
    System.out.println();
    System.out.println("APPLICATION PROPERTIES:");
    System.out.println("------------------------------------------------------------------");

    MongoConfigProperties mongoProperties = applicationContext.getBean(MongoConfigProperties.class);
    print("mongo.host", mongoProperties.getHost());
    print("mongo.port", mongoProperties.getPort());
    print("mongo.database", mongoProperties.getDatabase());
    print("mongo.user", mongoProperties.getUser());
    print("mongo.password", mongoProperties.getPassword());

    MailConfigProperties mailConfigProperties = applicationContext.getBean(MailConfigProperties.class);
    print("mail.api.base.url", mailConfigProperties.getApiBaseUrl());
    print("mail.api.token", mailConfigProperties.getApiToken());
    print("mail.domain", mailConfigProperties.getDomain());
    print("mail.from.account", mailConfigProperties.getFromAccount());

    SecurityConfigProperties securityConfigProperties = applicationContext.getBean(SecurityConfigProperties.class);
    print("security.persistent.login.key", securityConfigProperties.getPersistentLoginKey());

    Environment environment = applicationContext.getBean(Environment.class);
    print("spring.resources.chain.cache", environment.getProperty("spring.resources.chain.cache=false"));
    print("spring.jackson.serialization.indent_output", environment.getProperty("spring.jackson.serialization" +
        ".indent_output"));
    print("spring.jackson.serialization-inclusion", environment.getProperty("spring.jackson.serialization-inclusion"));
    String activeProfiles = join(environment.getActiveProfiles());
    print("spring.profiles.active", !isNullOrEmpty(activeProfiles) ? activeProfiles : "default");
    System.out.println("------------------------------------------------------------------");
  }

  private static void print(String property, Object value) {
    System.out.println(property + "=" + value);
  }
}
