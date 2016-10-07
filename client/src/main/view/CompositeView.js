import View from './View';

class CompositeView {
  constructor() {
    this.views = Array.prototype.slice.call(arguments);
    this._ = _;
  }

  getInitialState(routeState) {
    return Promise.all(this.views.map((view) => view.getInitialState(routeState))).then((viewStates) => {
      return viewStates.reduce((output, viewState) => {
        return this._.merge({}, output, viewState);
      }, {});
    });
  }

  bind(viewState) {
    return Promise.all(this.views.map(view => view.bind(viewState))).then(() => {
      return this;
    });
  }

  unbind() {
    return this.views.forEach((view) => view.unbind());
  }
}


export default CompositeView;