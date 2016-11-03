import { Broker, TemplateLoader } from '../middleware';
import Ractive from 'ractive';

class View {
  constructor(el, templateUrl) {
    this.$ = $;
    this._ = _;
    this.el = el;
    this.$el = this.$(el);
    this.html = this.$el.html();
    this.templateUrl = templateUrl;
    this.model = null;
    this.broker = Broker.instance;
    this.templateLoader = TemplateLoader.instance;
    this.route = null;
    this.ractive = null;
  }

  withRoute(route) {
    this.route = route;
    return this;
  }

  getTemplate() {
    if (this.templateUrl) {
      return this.templateLoader.load(this.$el, this.templateUrl);
    } else {
      return Promise.resolve({html: this.html});
    }
  }

  getModel() {
    return Promise.resolve({});
  }

  setup(template, model) {
    const ractive = new Ractive({
      el: this.$el,
      template: template.html,
      data: model
    });
    this.ractive = ractive;
    return Promise.resolve(ractive);
  }

  teardown() {
    if (this.ractive) {
      this.ractive.teardown();
    }
  }

  render() {
    return this.getTemplate().then((template)=> {
      return this.getModel().then((model) => {
        this.model = model;
        return this.setup(template, model).then((ractive)=> {
          this.ractive = ractive;
          return this;
        });
      });
    });
  }

}

export default View;