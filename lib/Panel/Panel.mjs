

class Panel extends HTMLElement {
  #internals;

  constructor() {
    super();
    this.handleTransitionEnd = this.handleTransitionEnd.bind(this);

    this.#internals = this.attachInternals();

    this.shadow = this.attachShadow({mode: 'open'});
    this.layer = document.createElement('div');
    this.layer.classList.add('layer');
    this.shadow.appendChild(this.layer);
    
    this.panel = document.createElement('div');
    this.panel.classList.add('panel');
    this.layer.appendChild(this.panel);

    const host = this.shadowRoot.host;

    this.#internals.states.add('--shown');

    host.addEventListener('transitionend', this.handleTransitionEnd);
  }

  handleTransitionEnd(event) {
    if (event.target !== this.shadowRoot.host) return;
  
    const target = event.target
    const style = window.getComputedStyle(target);
    
    let fullyVisible = false;
    let fullyHidden = false;

    if (event.propertyName === 'transform') {
      const matrix = new DOMMatrixReadOnly(style.transform);
      const x = matrix.e;
      const y = matrix.f;
      const sx = matrix.a;
      const sy = matrix.d;
      
      const { width, height } = target.getBoundingClientRect();

      const fullyVisibleX = x === 0;
      const fullyVisibleY = y === 0;
      const fullyVisibleWidth = sx === 1;
      const fullyVisibleHeight = sy === 1;

      fullyVisible = fullyVisibleX && fullyVisibleY && fullyVisibleWidth && fullyVisibleHeight;
      fullyHidden = !fullyVisible;
    }

    if (event.propertyName === 'opacity') {
      fullyVisible = style.opacity === '1';
      fullyHidden = style.opacity === '0';
    }

    if (fullyVisible) {
      this.#internals.states.add('--shown');
      this.#internals.states.delete('--showing');
    }

    if (fullyHidden) {
      this.#internals.states.add('--hidden');
      this.#internals.states.delete('--hiding');
    }

    if (fullyVisible || fullyHidden) {
      this.endAnimation();
    }

    if (fullyVisible) {
      this.dispatchEvent(new CustomEvent('x-panel:shown'));
    }

    if (fullyHidden) {
      this.dispatchEvent(new CustomEvent('x-panel:hidden'));
    }

    
  }

  startAnimation() {
    this._animating = true;

    this.animate();
  }

  
  endAnimation() {
    this._animating = false;
  }

  animate() {
    if (!this._animating) return;
    
    const event = new CustomEvent('x-panel:animate');
    this.dispatchEvent(event);

    window.requestAnimationFrame(() => this.animate());
  }

  connectedCallback() {
    this.render();

    window.requestAnimationFrame(() => {
      this.#internals.states.add('--initialized');
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host(x-panel[hidden]) {
          display: block !important;
        }

        :host {
          position: absolute;
        }

        :host(:state(--initialized)) {
          transition: all 0.33s ease-in-out;
        }

        :host([orientation*="top"]:not([orientation*="center"])) {
          top: 0;
        }

        :host([orientation*="left"]:not([orientation*="center"])) {
          left: 0;
        }

        :host([orientation*="top"][orientation*="center"]),
        :host([orientation*="bottom"][orientation*="center"]) {
          left: 50%;
          transform: translateX(-50%);
        }

        :host([orientation*="left"][orientation*="center"]),
        :host([orientation*="right"][orientation*="center"]) {
          top: 50%;
          transform: translateY(-50%);
        }

        :host([orientation*="right"]) {
          right: 0;
        }

        :host([orientation*="bottom"]) {
          bottom: 0;
        }

        :host([orientation="center"]) {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(1, 1);
        }

        /* HIDDEN */

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="left"]:not([orientation*="center"]):not([orientation*="right"])) {
          transform: translateX(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="right"]:not([orientation*="center"]):not([orientation*="left"])) {
          transform: translateX(100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="top"][orientation*="center"]) {
          transform: translateX(-50%) translateY(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="top"][orientation*="left"][orientation*="right"]:not([orientation*="bottom"])) {
          transform: translateY(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="bottom"][orientation*="center"]) {
          transform: translateX(-50%) translateY(100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="bottom"][orientation*="left"][orientation*="right"]:not([orientation*="top"])) {
          transform: translateY(100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="left"][orientation*="center"]) {
          transform: translateY(-50%) translateX(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="left"][orientation*="top"][orientation*="bottom"]:not([orientation*="right"])) {
          transform: translateX(-100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="right"][orientation*="center"]) {
          transform: translateY(-50%) translateX(100%);
        }

        :host([hidden]:where([animation='slide'],:not([animation]))[orientation*="right"][orientation*="top"][orientation*="bottom"]:not([orientation*="left"])) {
          transform: translateX(100%);
        }

        :host([hidden][orientation="center"]:where([animation='slide'],:not([animation]))) {
          transform: translate(-50%, -50%) scale(0, 0);
        }

        :host([hidden][orientation*="left"][orientation*="right"][orientation*="top"][orientation*="bottom"]:where([animation='slide'],:not([animation]))) {
          transform: scale(0, 0);
        }

        :host([hidden][animation*='fade']) {
          opacity: 0;
          visibility: hidden;
          transition: visibility 0s 0.33s, opacity 0.33s linear;
        }

      </style>
      <slot></slot>
    `;
    
  }

  set hidden(val) {
    if (val) {
      this.setAttribute('hidden', '');
    } else {
      this.removeAttribute('hidden');
    }
  }

  get hidden() {
    return this.hasAttribute('hidden');
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

  get orientation() {
    return this.getAttribute('orientation') || 'top left';
  }

  get state () {
    const states = [...this.#internals.states.values()]
      .filter(state => state !== '--initialized')
      .map(state => state.replace('--', ''));

    return states.pop();
  }
  
  static get observedAttributes() {
    return ['hidden', 'orientation'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'hidden') {
      const hidden = this.hasAttribute('hidden');
      const isInitialized = this.#internals.states.has('--initialized');

      if (hidden) {
        this.dispatchEvent(new CustomEvent('x-panel:hide'));
      } else {
        this.dispatchEvent(new CustomEvent('x-panel:show'));
      }

      if (hidden) {
        if (isInitialized) {
          this.#internals.states.delete('--shown');
          this.#internals.states.delete('--showing');
          this.#internals.states.add('--hiding');
        } else {
          this.#internals.states.add('--hidden');
        }
      } else {
        if (isInitialized) {
          this.#internals.states.delete('--hidden');
          this.#internals.states.delete('--hiding');
          this.#internals.states.add('--showing');
        } else {
          this.#internals.states.add('--shown');
        }
      }

      if (this.#internals.states.has('--initialized')) {
        this.startAnimation();
      }

      return;
    }

    this[name] = newValue;
  }
}

if (!customElements.get('x-panel')) {
  customElements.define('x-panel', Panel);
}

export default Panel;