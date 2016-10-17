class Route {
  constructor(name, path, view) {
    this.name = name;
    this.path = path;
    this.view = view;
    this.$ = $;
  }

  getPath() {
    return this.path;
  }

  handle(route) {
    return this.view.bind(Object.assign({}, { name: this.name}, route));
  }
}

export default Route;
