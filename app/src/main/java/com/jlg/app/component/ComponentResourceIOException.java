package com.jlg.app.component;

import java.io.IOException;

public class ComponentResourceIOException extends RuntimeException {
  private static final long serialVersionUID = 7165389466834485276L;

  public ComponentResourceIOException(IOException e) {
    super(e);
  }
}
