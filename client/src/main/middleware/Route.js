class Route {
  constructor(name, path, view) {
    this.name = name;
    this.path = path;
    this.view = view;
    this.rivets = rivets;
    this.$ = $;
    this._ = _;
  }

  getPath() {
    return this.path;
  }

  handle(routeState) {
    const namedRouteState = this._.assign({}, { name: this.name}, routeState);
    return this.view.getInitialState(namedRouteState).then((viewState) => {
      const extendedViewState = this._.assign({ route: namedRouteState }, viewState);
      return this.view.bind(extendedViewState);
    });
  }
}

export default Route;
