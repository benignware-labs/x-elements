/**
 * @element x-select
 * @attr {string} name
 * @attr {string} value
 */
export default class XSelect extends HTMLElement {
  static formAssociated = true; // this is needed
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();

    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
      </style>
      <slot></slot>
    `;

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    const items = this.querySelectorAll('x-option');
    const isMultiple = this.hasAttribute('multiple');

    if (isMultiple) {
      return;
    }

    if (!event.target.selected) {
      return;
    }

    for (const item of items) {
      if (item !== event.target) {
        if (item.selected) {
          item.setAttribute('selected', '');
        } else {
          item.removeAttribute('selected');
        }
      }
    }

    this.#internals.setFormValue(event.target.value);

    const change = new Event("change", {
      bubbles: false,
      composed: true,
    });

    // Dispatch the event.
    this.dispatchEvent(change);

    if (this.#internals.form) {
      this.#internals.form.dispatchEvent(
        new Event("change", {
          bubbles: false,
          composed: true,
        }),
      );
    }
  }

  get value() {
    const items = this.querySelectorAll('x-option');

    for (const item of items) {
      if (item.selected) {
        return item.value;
      }
    }

    return '';
  }

  get selectedIndex() {
    const items = [...this.querySelectorAll('x-option')];

    return items.findIndex(item => item.selected);
  }

  connectedCallback() {
    // Listen for the event.
    this.addEventListener(
      "x-option:change",
      this.handleChange,
      false,
    );
  }

  static get observedAttributes() {
    return ['name', 'value', 'multiple'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    this[name] = newValue;
  }
}

if (!customElements.get('x-select')) {
  customElements.define('x-select', XSelect);
}