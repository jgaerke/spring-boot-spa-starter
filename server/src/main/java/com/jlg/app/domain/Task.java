package com.jlg.app.domain;

import lombok.*;
import lombok.experimental.Wither;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@AllArgsConstructor
@Getter
@Builder
@ToString
@EqualsAndHashCode
@Wither
@Document
public class Task {
  private String name;
  private String description;
  private List<Reference> references;
  private boolean complete;
  private Instant completeByDate;
  private Instant completedOnDate;
  private Instant createdDate;
  private Instant lastModifiedDate;
}
