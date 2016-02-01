package com.jlg.app.support.util;

import com.google.common.collect.ImmutableMap;

import java.util.List;
import java.util.Map;

public class MapSupport {
    public static Map pruneNullAndEmptyEntries(Map map) {
        if (map == null) {
            return null;
        }
        ImmutableMap.Builder builder = ImmutableMap.builder();
        map.forEach((k, v) -> {
            if (v != null) {
                if (v instanceof Map) {
                    if (!((Map) v).isEmpty()) {
                        builder.put(k, pruneNullAndEmptyEntries((Map) v));
                    }
                } else if (v instanceof List) {
                    if (!((List) v).isEmpty()) {
                        builder.put(k, v);
                    }
                } else {
                    builder.put(k, v);
                }
            }
        });
        return builder.build();
    }
}
