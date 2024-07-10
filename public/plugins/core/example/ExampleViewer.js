(() => {
  const shadowHosts = [];

  Element.prototype.querySelector = new Proxy(Element.prototype.querySelector, {
    apply(target, thisArg, args, receiver) {
      const el = shadowHosts
        .filter(host => thisArg === host || thisArg.contains(host))
        .reduce((acc, host) => {
          return acc || host.shadowRoot.querySelector(...args);
        }, null);

      if (el) {
        return el;
      }

      return target.apply(thisArg, args, receiver);
    }
  });

  const contains = Element.prototype.contains;

  Element.prototype.contains = new Proxy(contains, {
    apply(target, thisArg, args, receiver) {
      const el = shadowHosts
        .filter(host => thisArg === host || contains.call(thisArg, host))
        .reduce((acc, host) => {
          return acc || host.shadowRoot.contains(...args);
        }, null);

      if (el) {
        return el;
      }

      return target.apply(thisArg, args, receiver);
    }
  });

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
          width: 100%;
          height: auto !important;
          /*overflow: auto;*/
          overflow: visible;
        }

        :host > .example-body {
          min-height: 0 !important;
          display: block !important;
          width: 100% !important;
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

      const cssrefs = this.shadowRoot.querySelectorAll('link[rel="stylesheet"]');

      cssrefs.forEach((link) => {
        link.addEventListener('load', (event) => {
          console.log('loaded', event.currentTarget.sheet);
          for (
            let i = 0;
            i < event.currentTarget.sheet.cssRules.length;
            i++
        ) {
            if (event.currentTarget.sheet.cssRules[i].type == 5) { // type 5 is @font-face
                const split = event.currentTarget.href.split('/');
                const stylePath = split
                    .slice(0, split.length - 1)
                    .join('/');
                let cssText =
                    event.currentTarget.sheet.cssRules[i].cssText;
                cssText = cssText.replace(
                    // relative paths
                    /url\s*\(\s*[\'"]?(?!((\/)|((?:https?:)?\/\/)|(?:data\:?:)))([^\'"\)]+)[\'"]?\s*\)/g,
                    `url("${stylePath}/$4")`
                );

                const st = document.createElement('style');
                st.appendChild(document.createTextNode(cssText));
                document
                    .getElementsByTagName('head')[0]
                    .appendChild(st);
            }
        }
        });
      });
    }

    disconnectedCallback() {
      removeShadowHost(this);
    }
  }
  
  customElements.define('example-viewer', ExampleViewer);
})();