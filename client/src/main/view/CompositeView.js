import View from './View';

class CompositeView {
  constructor() {
    this.views = Array.prototype.slice.call(arguments);
  }

  withRoute(route) {
    this.views.forEach((view) => view.withRoute(route));
    return this;
  }

  render() {
    return Promise.all(this.views.map((view) => view.render())).then(()=> this);
  }

  teardown() {
    return Promise.all(this.views.map((view) => view.teardown())).then(()=> this);
  }
}


export default CompositeView;