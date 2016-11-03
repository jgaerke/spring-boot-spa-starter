import { Broker, TemplateLoader } from '../middleware';
import Ractive from 'ractive';

class View {
  constructor(container, view, templateUrl) {
    this.$ = $;
    this._ = _;
    this.container = container;
    this.$container = $(container);
    this.view = view;
    this.$view = $(view);
    this.initialHtml = this.$view.html();
    this.templateUrl = templateUrl;
    this.model = null;
    this.broker = Broker.instance;
    this.templateLoader = TemplateLoader.instance;
    this.ractive = null;
  }

  withRoute(route) {
    this.route = route;
    return this;
  }

  getTemplate() {
    const initialHtml = this.initialHtml;

    if (this.templateUrl) {
      return this.templateLoader.load(this.templateUrl).then((template)=> {
        template.append = true;
        return template;
      }).catch((error) => {
        console.log('template loading error', error);
        return error;
      });
    }
    return Promise.resolve({html: initialHtml, append: false });
  }

  getModel() {
    return Promise.resolve({ route: this.route });
  }

  setup(template, model) {
    const $ = this.$;
    const view = this.view;
    const $container = this.$container;

    this.model = model;
    if(template.append) {
      $(template.html).appendTo($container);
    }
    this.$view = $(view);

    const ractive = new Ractive({
      el: this.$view,
      template: template.html,
      data: model
    });
    this.ractive = ractive;
    return Promise.resolve(ractive);
  }

  teardown() {
    const ractive = this.ractive;
    const $container = this.$container;

    if (ractive) {
      ractive.teardown();
      $container.empty();
    }
  }

  render() {
    return this.getTemplate().then((template)=> {
      return this.getModel().then((model) => {
        return this.setup(template, model).then((ractive)=> {
          return this;
        });
      });
    });
  }

}

export default View;