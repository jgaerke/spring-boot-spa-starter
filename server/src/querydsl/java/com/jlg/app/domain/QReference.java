package com.jlg.app.domain;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.Generated;
import com.querydsl.core.types.Path;


/**
 * QReference is a Querydsl query type for Reference
 */
@Generated("com.querydsl.codegen.EmbeddableSerializer")
public class QReference extends BeanPath<Reference> {

    private static final long serialVersionUID = -1323856540L;

    public static final QReference reference = new QReference("reference");

    public final StringPath id = createString("id");

    public final EnumPath<ReferenceType> type = createEnum("type", ReferenceType.class);

    public QReference(String variable) {
        super(Reference.class, forVariable(variable));
    }

    public QReference(Path<? extends Reference> path) {
        super(path.getType(), path.getMetadata());
    }

    public QReference(PathMetadata metadata) {
        super(Reference.class, metadata);
    }

}

