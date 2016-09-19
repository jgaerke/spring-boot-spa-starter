import $ from 'jquery';
import rivets from 'rivets';

class View {
  constructor(selector = '#viewport',
              partial,
              dataProducer = ()=> {},
              $ = View.$,
              rivets = View.rivets) {
    this.selector = selector;
    this.partial = partial;
    this.dataProducer = dataProducer;
    this.$ = $;
    this.rivets = rivets
  }

  bind(data) {
    return this.rivets.bind(this.$(this.selector), Object.assign({route: data}, this.dataProducer()));
  }

  render(data, onBindComplete = ()=> {}) {
    if(View.cache[this.partial]) {
      this.$(this.selector).html(View.cache[this.partial]);
      return onBindComplete(this.bind(data));
    }
    this.$(this.selector).load(this.partial, (html, responseText, jqXhr)=> {
      if(jqXhr.status && jqXhr.status.toString().indexOf('2') == 0) {
        View.cache[this.partial] = html;
      }
      onBindComplete(this.bind(data));
    });
  }
};

View.cache = {};
View.$ = $;
View.rivets = rivets;

export default View;