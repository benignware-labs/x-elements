(() => {
  Element.prototype.querySelector = new Proxy(Element.prototype.querySelector, {
    apply(target, thisArg, args, receiver) {
      const el = shadowHosts.reduce((acc, host) => {
        return acc || host.shadowRoot.querySelector(...args);
      }, null);

      if (el) {
        return el;
      }

      return target.apply(thisArg, args, receiver);
    }
  });

  const shadowHosts = [];

  const addShadowHost = (host) => {
    shadowHosts.push(host);
  }

  const removeShadowHost = (host) => {
    shadowHosts = shadowHosts.filter((h) => h !== host);
  }

  const getDocumentProxy = (document) => {
    
    document.querySelector = new Proxy(document.querySelector, {
      apply(target, thisArg, args, receiver) {
        const el = shadowHosts.reduce((acc, host) => {
          return acc || host.shadowRoot.querySelector(...args);
        }, null);
  
        if (el) {
          return el;
        }
  
        return target.apply(thisArg, args, receiver);
      }
    });
  
    document.querySelectorAll = new Proxy(document.querySelectorAll, {
      apply(target, thisArg, args, receiver) {
        const el = shadowHosts.reduce((acc, host) => {
          return [...acc, ...host.shadowRoot.querySelectorAll(...args)];
        }, []);
  
        if (el) {
          return el;
        }
  
        return target.apply(thisArg, args, receiver);
      }
    });
    
    document.addEventListener = new Proxy(document.addEventListener, {
      apply(target, thisArg, args, receiver) {
        const [ type, listener, options ] = args;

        const fn = (e) => {
          const host = shadowHosts.find((host) => e.composedPath().includes(host));
  
          if (host) {
            const orig = e.composedPath()[0];
            
            e = {
              ...e,
              target: orig,
              currentTarget: orig
            }
          }
  
          listener(e);
        }
  
        return target.apply(thisArg, [ type, fn, options ], receiver);
      }
    });
  };

  globalThis.document = getDocumentProxy(globalThis.document);
  
  class ExampleViewer extends HTMLElement {
    constructor() {
      super();
  
      this.attachShadow({ mode: "open" });

      const style = document.createElement('style');

      style.textContent = `
        :host {
          display: block;
          height: auto !important;
        }

        :host > .example-body {
          min-height: 0 !important;
          display: block !important;
        }
      `;

      this.shadowRoot.appendChild(style);
      
      addShadowHost(this);
    }

    connectedCallback() {
      const templateSelector = this.getAttribute("template");
      const template = document.querySelector(templateSelector);
  
      if (!template) {
        console.error("Template not found", templateSelector);
        return;
      }
  
      const content = template.content.cloneNode(true);
  
      this.shadowRoot.appendChild(content);
    }

    disconnectedCallback() {
      removeShadowHost(this);
    }
  }
  
  customElements.define('example-viewer', ExampleViewer);
})();