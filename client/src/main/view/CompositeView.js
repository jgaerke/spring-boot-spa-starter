import View from './View';

class CompositeView {
  constructor() {
    this.views = Array.prototype.slice.call(arguments);
    this._ = _;
  }

  bind(route) {
    return Promise.all(this.views.map(view => view.bind(route))).then(() => {
      return this;
    });
  }

  unbind() {
    return this.views.forEach((view) => view.unbind());
  }
}


export default CompositeView;