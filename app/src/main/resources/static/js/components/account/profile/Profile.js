(function () {
    var Profile = Component.extend({

        init: function ($, errorHandler, router, account, formHandlerFactory) {
            this.$ = $;
            this.errorHandler = errorHandler;
            this.router = router;
            this.account = account;
            this.formHandlerFactory = formHandlerFactory;
            this.profile = {};
            this.editing = false;
        },

        onAfterMount: function () {
            this.profileFormHandler = this.formHandlerFactory.create('#profileForm', this.tag);
            this.account.getCurrent().done(this.onGetCurrentSuccess).fail(this.onGetCurrentError);
        },

        onAfterUnMount: function () {
            this.reset();
        },

        onGetCurrentSuccess: function (profile, status) {
            this.profile = profile;
            this.profileFormHandler.values(profile);
            this.tag.update();
        },

        onGetCurrentError: function (jqXHR, textStatus, errorThrown) {
            //this.errorHandler.handle(jqXHR.status, {
            //  401: { form: this.form, text: 'Email address or password invalid.' }
            //});
            //this.tag.update();
            console.log(jqXHR);
            this.tag.update();
        },

        onUpdateAccountSuccess: function (profile, status) {
            console.log('success');
            this.editing = false;
            this.profileFormHandler.commit();
        },

        onUpdateAccountError: function (jqXHR, textStatus, errorThrown) {
            //this.errorHandler.handle(jqXHR.status, {
            //  401: { form: this.form, text: 'Email address or password invalid.' }
            //});
            //this.tag.update();
            this.tag.update();
        },

        toggle: function (e) {
            this.editing = e.target.checked;
            if (!this.editing) {
                this.profileFormHandler.rollback();
            }
            this.tag.update();
        },

        reset: function () {
            this.editing = false;
            this.profile = this.originalProfile || this.profile;
            this.tag.update();
        },

        submit: function (e) {
            this.account.update(this.profileFormHandler.values()).done(this.onUpdateAccountSuccess).fail(this.onUpdateAccountError);
        }
    });


    app.component(
        'Profile',
        Profile,
        [
            '$',
            'ErrorHandler',
            'Router',
            'Account',
            'FormHandlerFactory'
        ]
    );

    app.routes.push({
        path: '/settings/profile',
        component: 'Profile',
        tag: 'profile',
        authenticate: true
    });

    app.routes.push({
        templateName: 'profileEdit',
        path: '/settings/profile/edit',
        component: 'Profile',
        tag: 'profile-edit',
        authenticate: true
    });

})();
