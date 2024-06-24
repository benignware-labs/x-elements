class Panel extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.layer = document.createElement('div');
    this.layer.classList.add('layer');
    this.shadow.appendChild(this.layer);
    
    this.panel = document.createElement('div');
    this.panel.classList.add('panel');
    this.layer.appendChild(this.panel);
  }

  connectedCallback() {
    this.panel.innerHTML = `
      <style>
        :host([hidden]) {
          display: block;
        }

        :host {
          color: #333333;
          font: 26px Arial, sans-serif;
          position: absolute;
          transition: transform 0.3s;
        }

        :host([orientation*="top"]:not([orientation*="center"])) {
          top: 0;
        }

        :host([orientation*="left"]:not([orientation*="center"])) {
          left: 0;
        }

        :host([hidden][orientation*="left"]:not([orientation*="center"])) {
          transform: translateX(-100%);
        }

        :host([hidden][orientation*="right"]:not([orientation*="center"])) {
          transform: translateX(100%);
        }

        :host([orientation*="top"][orientation*="center"]),
        :host([orientation*="bottom"][orientation*="center"]) {
          left: 50%;
          transform: translateX(-50%);
        }

        :host([hidden][orientation*="top"][orientation*="center"]) {
          transform: translateX(-50%) translateY(-100%);
        }

        :host([hidden][orientation*="bottom"][orientation*="center"]) {
          transform: translateX(-50%) translateY(100%);
        }

        :host([orientation*="left"][orientation*="center"]),
        :host([orientation*="right"][orientation*="center"]) {
          top: 50%;
          transform: translateY(-50%);
        }

        :host([hidden][orientation*="left"][orientation*="center"]) {
          transform: translateY(-50%) translateX(-100%);
        }

        :host([hidden][orientation*="right"][orientation*="center"]) {
          transform: translateY(-50%) translateX(100%);
        }

        :host([orientation*="right"]) {
          right: 0;
        }

        :host([orientation*="bottom"]) {
          bottom: 0;
        }
      </style>
      <slot></slot>
    `;
  }

  get orientation() {
    return this.hasAttribute('orientation');
  }
  
  set orientation(val) {
    if (val !== this.getAttribute('orientation')) {
      if (val) {
        this.setAttribute('orientation', val);
      } else {
        this.removeAttribute('orientation');
      }
    }
  }
  
  static get observedAttributes() {
    return ['orientation'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    this[name] = newValue;
  }
}

customElements.define('x-panel', Panel);

export default Panel;