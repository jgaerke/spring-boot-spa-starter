(function () {
  var Billing = Module.extend({

    init: function ($, errorHandler, router, account) {
      this.$ = $;
      this.errorHandler = errorHandler;
      this.router = router;
      this.account = account;
    },

    onMount: function (tag) {
      this.tag = tag;
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
    }
  });


  app.component(
      'Billing',
      Billing,
      [
        '$',
        'ErrorHandler',
        'Router',
        'Account'
      ]
  );

  app.routes.push({
    path: '/settings/billing',
    component: 'Billing',
    tag: 'billing',
    authenticate: true
  });

  app.routes.push({
    templateName: 'billingEdit',
    path: '/settings/billing/edit',
    component: 'Billing',
    tag: 'billing-edit',
    authenticate: true
  });

})();
