(function () {
    var Profile = Component.extend({

        init: function ($, errorHandler, router, account, form) {
            this.$ = $;
            this.errorHandler = errorHandler;
            this.router = router;
            this.account = account;
            this.form = form;
            this.profile = {};
            this.editing = false;
        },

        onAfterMount: function () {
            this.profileForm = this.form.bind('#profileForm', this.tag);
            this.account.getCurrent().done(this.onGetCurrentSuccess).fail(this.onGetCurrentError);
        },

        onAfterUnMount: function () {
            this.profileForm.rollback();
        },

        onGetCurrentSuccess: function (profile, status) {
            this.profile = profile;
            this.profileForm.values(profile);
            this.tag.update();
        },

        onGetCurrentError: function (jqXHR, textStatus, errorThrown) {
            //this.errorHandler.handle(jqXHR.status, {
            //  401: { form: this.form, text: 'Email address or password invalid.' }
            //});
            //this.tag.update();
            console.log(jqXHR);
        },

        onUpdateAccountSuccess: function (profile, status) {
            console.log('success');
            this.editing = false;
            this.profileForm.commit();
        },

        onUpdateAccountError: function (jqXHR, textStatus, errorThrown) {
            //this.errorHandler.handle(jqXHR.status, {
            //  401: { form: this.form, text: 'Email address or password invalid.' }
            //});
        },

        toggle: function (e) {
            this.editing = e.target.checked;
            if (!this.editing) {
                this.profileForm.rollback();
            }
            this.tag.update();
        },

        submit: function (e) {
            this.account.update(this.profileForm.values()).done(this.onUpdateAccountSuccess).fail(this.onUpdateAccountError);
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
            'Form'
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
