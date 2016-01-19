(function () {
  var Billing = Component.extend({

    init: function ($, errorHandler, router, account, plans) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
      this.isEditingPlan = false;
      this.plans = plans;
    },

    onAfterMount: function () {
      this.plans.on('select', this.selectPlan);
      this.account.getCurrent().done(this.onGetCurrentSuccess).fail(this.onGetCurrentError);


      //this.form = this.$('form', tag.root).form({
      //  inline: false//,
      //  //fields: {
      //  //  email: ['email', 'empty']
      //  //}
      //});

      $('input.card-number').payment('formatCardNumber');
      $('input.card-exp').payment('formatCardExpiry');
      $('input.card-cvc').payment('formatCardCVC');

      $('#payment-form').submit(function (event) {
        var $form = $(this);

        // Disable the submit button to prevent repeated clicks
        $form.find('button').prop('disabled', true);

        //Stripe.card.createToken($form, stripeResponseHandler);
        alert(JSON.stringify($('input.card-exp').payment('cardExpiryVal')));

        $form.find('button').prop('disabled', false);


        //Stripe.card.createToken({
        //  number: $('.card-number').val(),
        //  cvc: $('.card-cvc').val(),
        //  exp_month: $('.card-expiry-month').val(),
        //  exp_year: $('.card-expiry-year').val()
        //}, stripeResponseHandler);

        //{
        //  id: "tok_u5dg20Gra", // String of token identifier,
        //      card: {...}, // Dictionary of the card used to create the token
        //  created: 1452731840, // Integer of date token was created
        //      currency: "usd", // String currency that the token was created in
        //    livemode: true, // Boolean of whether this token was created with a live or test API key
        //    object: "token", // String identifier of the type of object, always "token"
        //    used: false // Boolean of whether this token has been used
        //}

        //function stripeResponseHandler(status, response) {
        //  var $form = $('#payment-form');
        //
        //  if (response.error) {
        //    // Show the errors on the form
        //    $form.find('.payment-errors').text(response.error.message);
        //    $form.find('button').prop('disabled', false);
        //  } else {
        //    // response contains id and card, which contains additional card details
        //    var token = response.id;
        //    // Insert the token into the form so it gets submitted to the server
        //    $form.append($('<input type="hidden" name="stripeToken" />').val(token));
        //    // and submit
        //    $form.get(0).submit();
        //  }
        //}

        // Prevent the form from submitting with the default action
        // Prevent the form from submitting with the default action
        return false;
      });

      //this.$(this.tag.root).ready(function() {
      //  //var s = document.createElement("script");
      //  //s.type = "text/javascript";
      //  //s.src = "https://js.stripe.com/v2/"
      //  //$("body").append(s);
      //
      //
      //  $.getScript("https://js.stripe.com/v2/", function(){
      //
      //

      //  });
      //
      //});
    },

    onAfterUnMount: function () {
      this.plans.off('subscribe', this.subscribe);
      this.isEditingPlan = false;
      delete this.profile;
    },

    onGetCurrentSuccess: function (profile, status) {
      this.profile = profile;
      this.setVisiblePlans(profile);
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

    setVisiblePlans: function (profile) {
      this.plans.isBasicVisible = false;
      this.plans.isProVisible = false;
      this.plans.isPremiumVisible = false;
      this.plans.isReadOnly = true;

      if (this.isEditingPlan || !this.profile.plan) {
        this.plans.isBasicVisible = true;
        this.plans.isProVisible = true;
        this.plans.isPremiumVisible = true;
        this.plans.isReadOnly = false;
        return;
      }
      if (profile.plan == 'basic') {
        return this.plans.isBasicVisible = true;
      }
      if (profile.plan == 'pro') {
        return this.plans.isProVisible = true;
      }
      if (profile.plan == 'premium') {
        return this.plans.isPremiumVisible = true;
      }
    },

    onUpdateAccountSuccess: function (profile, status) {
      console.log('success');
      this.isEditingPlan = false;
      this.setVisiblePlans(this.profile);
      this.tag.update();
    },

    onUpdateAccountError: function (jqXHR, textStatus, errorThrown) {
      //this.errorHandler.handle(jqXHR.status, {
      //  401: { form: this.form, text: 'Email address or password invalid.' }
      //});
      //this.tag.update();
      this.tag.update();
    },

    selectPlan: function (data) {
      this.profile.plan = data.plan;
      this.account.update(this.profile).done(this.onUpdateAccountSuccess).fail(this.onUpdateAccountError);
    },

    toggle: function (e) {
      this.isEditingPlan = e.target.checked;
      if(this.isEditingPlan) {
        this.originalProfile = this.$.extend({}, this.profile);
      } else {
        this.profile = this.$.extend({}, this.originalProfile);
      }
      this.setVisiblePlans(this.profile);
    }

  });


  app.component(
      'Billing',
      Billing,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account',
        'Plans'
      ]
  );

  app.routes.push({
    path: '/settings/billing',
    component: 'Billing',
    tag: 'billing',
    authenticate: true
  });

})();
