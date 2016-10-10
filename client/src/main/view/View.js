class View {
  constructor(el) {
    this.$ = $;
    this._ = _;
    this.el = el;
    this.$el = this.$(this.el);
  }

  bind(route) {
    Promise.resolve(this);
  }

  unbind() {
    console.log('unbind');
  }
}

export default View;