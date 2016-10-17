class View {
  constructor(el) {
    this.$ = $;
    this.el = el;
    this.$el = this.$(el);
    this.uid = View.uniqueId();
  }

  evaluate(expression) {
    const fn = new Function('return ' + expression + ';');
    return fn.call(this);
  }

  getRefs() {
    return {};
  }

  bindRefs() {
    const $ = this.$;

    $.each(this.getRefs(), (refKey, refVal) => {
      const name = refKey;
      const value = refVal.value;
      const expression = refVal.expression;
      const selector = refVal.selector;
      const events = refVal.events || {};
      const show = refVal.show;
      const hide = refVal.hide;
      const css = refVal.css || {};

      const ref = value ? this.evaluate(value) : expression ? this.evaluate(expression) : selector ? this.$el.find(selector) : null;

      if(!ref) {
        return;
      }

      $.each(events, (event, handler) => {
        ref.on(event + '.child.event.' + this.uid, $.isFunction(handler) ? handler : this[handler]);
      });

      $.each(css, (clazz, expression) => {
        const result = this.evaluate(expression);
        if(result) {
          ref.addClass(clazz);
        } else {
          ref.removeClass(clazz);
        }
      });

      if(show && this.evaluate(show)) {
        ref.show();
      }

      if(hide && this.evaluate(hide)) {
        ref.hide();
      }

      this[name] = ref;

    });
  }

  unBindRefs() {
    const $ = this.$;
    $.each(this.getRefs(), (refKey) => {
      const ref = this[refKey];
      if(ref instanceof $) {
        ref.off('child.event.' + this.uid);
      }
    });
  }

  bind(route) {
    this.route = route;
    this.bindRefs();
    if (this.onBind) {
      return this.onBind(route);
    }
    return Promise.resolve({});
  }

  unbind() {
    this.unBindRefs();
    if (this.onUnBind) {
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