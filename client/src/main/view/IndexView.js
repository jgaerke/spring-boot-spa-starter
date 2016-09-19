import $ from 'jquery';
import rivets from 'rivets';

class IndexView {
  constructor($ = IndexView.$, rivets = IndexView.rivets) {
    this.selector = '#viewport';
    this.partial = '/partials/index.html';
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

IndexView.$ = $;
IndexView.rivets = rivets;

export default IndexView;