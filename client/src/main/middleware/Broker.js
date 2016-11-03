let singleton = Symbol();
let singletonEnforcer = Symbol();


class Broker {
  constructor(enforcer) {
    if (enforcer !== singletonEnforcer) {
      throw "Cannot construct singleton"
    }
    this.$ = $;

    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.publish = this.publish.bind(this);
    this.hub = $({});
  }


  subscribe() {
    this.hub.on.apply(this.hub, arguments);
    return Promise.resolve(this);
  }

  unsubscribe() {
    this.hub.off.apply(this.hub, arguments);
    return Promise.resolve(this);
  }

  publish() {
    this.hub.trigger.apply(this.hub, arguments);
    return Promise.resolve(this);
  }

  static get instance() {
    if (!this[singleton]) {
      this[singleton] = new Broker(singletonEnforcer);
    }
    return this[singleton];
  }

}

export default Broker;