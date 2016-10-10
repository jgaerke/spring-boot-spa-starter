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

  handle(route) {
    return this.view.bind(this._.assign({}, { name: this.name}, route));
  }
}

export default Route;
