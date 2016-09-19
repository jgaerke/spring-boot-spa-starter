import $ from 'jquery';
import rivets from 'rivets';

class CreateAccountView {
  constructor($ = CreateAccountView.$, rivets = CreateAccountView.rivets) {
    this.selector = '#viewport';
    this.partial = '/partials/account/create-account.html';
    this.$ = $;
    this.rivets = rivets
  }

  bind(data) {
    return this.rivets.bind(this.$(this.selector), {route: data});
  }

  render(data, onBindComplete = ()=>{}) {
    this.$(this.selector).load(this.partial, (data)=> {
      onBindComplete(this.bind(data));
    });
  }
};

CreateAccountView.$ = $;
CreateAccountView.rivets = rivets;


export default CreateAccountView;