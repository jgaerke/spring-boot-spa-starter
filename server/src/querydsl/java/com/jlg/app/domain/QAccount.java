package com.jlg.app.domain;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QAccount is a Querydsl query type for Account
 */
@Generated("com.querydsl.codegen.EntitySerializer")
public class QAccount extends EntityPathBase<Account> {

    private static final long serialVersionUID = 1959692934L;

    public static final QAccount account = new QAccount("account");

    public final ListPath<org.springframework.security.core.GrantedAuthority, org.springframework.security.core.QGrantedAuthority> authorities = this.<org.springframework.security.core.GrantedAuthority, org.springframework.security.core.QGrantedAuthority>createList("authorities", org.springframework.security.core.GrantedAuthority.class, org.springframework.security.core.QGrantedAuthority.class, PathInits.DIRECT2);

    public final BooleanPath credentialsExpired = createBoolean("credentialsExpired");

    public final BooleanPath disabled = createBoolean("disabled");

    public final StringPath email = createString("email");

    public final BooleanPath expired = createBoolean("expired");

    public final StringPath first = createString("first");

    public final StringPath id = createString("id");

    public final StringPath last = createString("last");

    public final BooleanPath locked = createBoolean("locked");

    public final StringPath password = createString("password");

    public final StringPath passwordResetToken = createString("passwordResetToken");

    public final MapPath<String, Object, SimplePath<Object>> paymentInfo = this.<String, Object, SimplePath<Object>>createMap("paymentInfo", String.class, Object.class, SimplePath.class);

    public final StringPath plan = createString("plan");

    public final DateTimePath<java.time.LocalDateTime> trialExpirationDate = createDateTime("trialExpirationDate", java.time.LocalDateTime.class);

    public QAccount(String variable) {
        super(Account.class, forVariable(variable));
    }

    public QAccount(Path<? extends Account> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAccount(PathMetadata metadata) {
        super(Account.class, metadata);
    }

}

