

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

    console.log('ADD TRANSITION HANDLER', this.dataset);
    host.addEventListener('transitionend', this.handleTransitionEnd);
  }

  handleTransitionEnd(event) {
    console.log('TRANSITION END', event.target, event.propertyName, event.elapsedTime);
    const target = event.target
    const style = window.getComputedStyle(target);
    

    let fullyShown = false;
    let fullyHidden = false;

    if (event.propertyName === 'transform') {
      const matrix = new DOMMatrixReadOnly(style.transform);
      const x = matrix.e;
      const y = matrix.f;
      const sx = matrix.a;
      const sy = matrix.d;
      
      const orientations = this.orientation.split(' ');

      const width = target.offsetWidth;
      const height = target.offsetHeight;

      if (orientations.includes('top')) {
        fullyShown = y === 0;
        fullyHidden = y === -height;
      } else if (orientations.includes('bottom')) {
        fullyShown = y === 0;
        fullyHidden = y === height;
      } else if (orientations.includes('left')) {
        fullyShown = x === 0;
        fullyHidden = x === -width;
      } else if (orientations.includes('right')) {
        fullyShown = x === 0;
        fullyHidden = x === width;
      } else if (orientations.includes('center')) {
        fullyShown = sx === 1 && sy === 1;
        fullyHidden = sx === 0 && sy === 0;
      }
    }

    if (event.propertyName === 'opacity') {
      fullyShown = style.opacity === '1';
      fullyHidden = style.opacity === '0';
    }

    if (fullyShown) {
      this.#internals.states.add('--shown');
      this.#internals.states.delete('--showing');
    }

    if (fullyHidden) {
      this.#internals.states.add('--hidden');
      this.#internals.states.delete('--hiding');
    }

    if (fullyShown) {
      console.log('shown');
      this.dispatchEvent(new CustomEvent('x-panel:shown'));
    }

    if (fullyHidden) {
      console.log('hidden');
      this.dispatchEvent(new CustomEvent('x-panel:hidden'));
    }
  }

  connectedCallback() {
    console.log('*** CONNECTED CALLBACK', this.dataset.scene, [...this.#internals.states.values()]);
    this.render();

    window.requestAnimationFrame(() => {
      this.#internals.states.add('--initialized');
    });
  }

  render() {
    console.log('RENDER');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host([hidden]) {
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

        :host([hidden][orientation*="left"][orientation*="right"][orientation*="top"][orientation*="bottom"]) {
          transform: scale(0, 0);
        }

        :host([hidden][animation*='fade']) {
          opacity: 0;
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

      if (hidden) {
        console.log('HIDE', this.dataset.scene, this.isConnected,  this.parentNode);
      } else {
        console.log('SHOW', this.dataset.scene, this.isConnected, this.parentNode);
      }

      if (hidden) {
        if (this.#internals.states.has('--initialized')) {
          this.#internals.states.delete('--shown');
          this.#internals.states.delete('--showing');
          this.#internals.states.add('--hiding');
        } else {
          this.#internals.states.add('--hidden');
        }
      } else {
        if (this.#internals.states.has('--initialized')) {
          this.#internals.states.delete('--hidden');
          this.#internals.states.delete('--hiding');
          this.#internals.states.add('--showing');
        } else {
          this.#internals.states.add('--shown');
        }
      }

      return;
    }

    this[name] = newValue;
  }
}

customElements.define('x-panel', Panel);

export default Panel;