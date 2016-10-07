import { session } from '../middleware';

class View {
  constructor(viewSelector) {
    this.viewSelector = viewSelector;
    this.$ = $;
    this.rivets = rivets;
    this.binding = null;
    this.session = session;
  }
  
  getInitialState(routeState) {
    return Promise.resolve({});
  }
  
  bind(viewState) {
    this.state = viewState;
    //console.log(JSON.parse(JSON.stringify(viewState)));
    this.binding = this.rivets.bind(this.$(this.viewSelector), viewState);
    return Promise.resolve(this);
  }

  unbind() {
    if(this.binding) {
      this.binding.unbind();
    }
  }
}

export default View;