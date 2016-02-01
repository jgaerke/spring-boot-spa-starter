package com.jlg.app.support.util;

import static com.google.common.base.Strings.isNullOrEmpty;

public class StringSupport {
    public static String nullIfEmpty(String value) {
        if (isNullOrEmpty(value)) {
            return null;
        }
        return value;
    }
}
