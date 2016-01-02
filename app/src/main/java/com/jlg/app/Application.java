package com.jlg.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

@SpringBootApplication
@Controller
public class Application {

  @RequestMapping("/app")
  public String app() {
    return "app";
  }

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}
