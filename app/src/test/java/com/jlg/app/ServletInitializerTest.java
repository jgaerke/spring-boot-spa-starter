package com.jlg.app;

import com.jlg.app.Application;
import com.jlg.app.ServletInitializer;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.runners.MockitoJUnitRunner;
import org.springframework.boot.builder.SpringApplicationBuilder;

import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@RunWith(MockitoJUnitRunner.class)
public class ServletInitializerTest {

  @Test
  public void should_be_configured_properly() throws Exception {
    //given
    ServletInitializer servletInitializer = new ServletInitializer();
    SpringApplicationBuilder mockSpringApplicationBuilder = mock(SpringApplicationBuilder.class);

    //when
    servletInitializer.configure(mockSpringApplicationBuilder);

    //then
    verify(mockSpringApplicationBuilder).sources(eq(Application.class));
  }
}