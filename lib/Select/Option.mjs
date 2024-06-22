export default class XOption extends HTMLElement {
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();

    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          /* border: 2px solid transparent; */
          cursor: pointer;
        }

        :host(:state(--selected)) {
          /* border-color: blue; */
        }
      </style>
      <slot></slot>
    `;

    this.handleClick = this.handleClick.bind(this);
  }

  set value(value) {
    this.setAttribute('value', value);
  }

  get value() {
    return this.getAttribute('value') || '';
  }

  getSelected() {
    return this.#internals.states.has('--selected');
  }

  setSelected(flag) {
    if (flag !== this.getAttribute('selected')) {
      if (flag) {
        this.setAttribute('selected', flag);
      } else {
        this.removeAttribute('selected');
      }
    }

    if (flag === this.selected) {
      return;
    }

    if (flag) {
      this.#internals.states.add('--selected');
    } else {
      this.#internals.states.delete('--selected');
    }

    const event = new Event("x-option:change", {
      bubbles: true,
      composed: true,
    });

    window.requestAnimationFrame(() => {
      // Dispatch the event.
      this.dispatchEvent(event);
    });
  }

  set selected(flag) {
    this.setSelected(flag);
  }

  get selected() {
    return this.getSelected();
  }

  connectedCallback() {
    this.selected = this.hasAttribute('selected');
    this.addEventListener('click', this.handleClick);
  }

  handleClick() {
    const selected = !this.selected;
    const isMultiple = !!this.closest('x-select[multiple]');

    if (!selected && this.selected && !isMultiple) {
      return;
    }
  
    this.setSelected(selected);
  }

  static get observedAttributes() {
    return ['selected', 'value'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    this[name] = newValue;
  }
}

customElements.define('x-option', XOption);