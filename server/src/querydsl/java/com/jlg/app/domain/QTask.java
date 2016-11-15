package com.jlg.app.domain;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QTask is a Querydsl query type for Task
 */
@Generated("com.querydsl.codegen.EntitySerializer")
public class QTask extends EntityPathBase<Task> {

    private static final long serialVersionUID = -1343898676L;

    public static final QTask task = new QTask("task");

    public final BooleanPath complete = createBoolean("complete");

    public final DateTimePath<java.time.Instant> completeByDate = createDateTime("completeByDate", java.time.Instant.class);

    public final DateTimePath<java.time.Instant> completedOnDate = createDateTime("completedOnDate", java.time.Instant.class);

    public final DateTimePath<java.time.Instant> createdDate = createDateTime("createdDate", java.time.Instant.class);

    public final StringPath description = createString("description");

    public final DateTimePath<java.time.Instant> lastModifiedDate = createDateTime("lastModifiedDate", java.time.Instant.class);

    public final StringPath name = createString("name");

    public final ListPath<Reference, QReference> references = this.<Reference, QReference>createList("references", Reference.class, QReference.class, PathInits.DIRECT2);

    public QTask(String variable) {
        super(Task.class, forVariable(variable));
    }

    public QTask(Path<? extends Task> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTask(PathMetadata metadata) {
        super(Task.class, metadata);
    }

}

