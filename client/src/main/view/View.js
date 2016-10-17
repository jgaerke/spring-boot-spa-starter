class View {
  constructor(el) {
    this.$ = $;
    this.el = el;
    this.$el = this.$(el);
    this.eventSelectorRegex = /^(\S+)\s*(.*)$/;
    this.uid = View.uniqueId();
  }

  getRefs() {
    return {};
  }

  getEvents() {
    return {};
  }

  bindRefs() {
    const refs = this.getRefs();
    if(refs) {
      Object.keys(refs).forEach((prop) => {
        this[prop] = this.$el.find(refs[prop]);
      });
    }
  }

  bindEvents() {
    const events = this.getEvents();
    const $ = this.$;
    const $el = this.$el;
    const eventSelectorRegex = this.eventSelectorRegex;

    if(events) {
      Object.keys(events).forEach((eventAndSelector) => {
        const handler = $.isFunction(events[handler]) ? handler : this[events[handler]];
        if($.isFunction(handler)) {
          const matches = eventAndSelector.match(eventSelectorRegex);
          const event = matches[0];
          const selector = matches[1];
          $el.on(event + '.delegate.' + this.uid, selector, handler);
        }
      });
    }
  }

  unBindRefs() {
    const refs = this.getRefs();
    if(refs) {
      Object.keys(refs).forEach((prop) => {
        delete this[prop];
      });
    }
  }

  unBindEvents() {
    this.$el.off('.delegate.' + this.uid);
  }

  bind(route) {
    this.bindRefs();
    this.bindEvents();
    if(this.onBind) {
      return this.onBind(route);
    }
    return Promise.resolve({});
  }

  unbind() {
    this.unBindRefs();
    this.unBindEvents();
    if(this.onUnBind) {
      this.onUnBind();
    }
  }

  rebind() {
    this.unbind();
    return this.bind();
  }
}

View.uniqueIdCounter = 0;
View.uniqueId = (prefix)=> {
  const id = ++View.uniqueIdCounter + '';
  return prefix ? prefix + id : id;
}

export default View;