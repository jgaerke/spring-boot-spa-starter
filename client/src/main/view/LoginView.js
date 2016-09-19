import $ from 'jquery';
import rivets from 'rivets';

class LoginView {
  constructor($ = LoginView.$, rivets = LoginView.rivets) {
    this.selector = '#viewport';
    this.partial = '/partials/account/login.html';
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

LoginView.$ = $;
LoginView.rivets = rivets;

export default LoginView;