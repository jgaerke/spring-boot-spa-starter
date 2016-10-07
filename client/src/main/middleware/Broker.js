class Broker {
  constructor() {
    this.subscriptions = {};
  }

  publish(event, message) {
    const subscriptions = this.subscriptions[event];
    if(subscriptions && subscriptions.length) {
      subscriptions.forEach((subscription) => {
        subscription(message);
      });
    }
  }

  subscribe(event, subscriber) {
    this.subscriptions[event] = this.subscriptions[event] || [];
    this.subscriptions[event].push(subscriber);
  }
}

export default Broker;
