<!--
  dest: components/Preloader.html
-->

# Preloader

<!-- Example -->

```css
img, test-element {
  aspect-ratio: 16/9;
  max-width: 300px;
}

.frame {
  position: relative;
}

.preloader {
  display: block;
  position: relative;
}

.preloader ~ .spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: none;
} 

.preloader:state(--loading) ~ .spinner {
  display: block;
}
```

```js
customElements.define('test-element', class TestElement extends HTMLElement {
  #complete = false;

  constructor() {
    super();

    this.handleLoad = this.handleLoad.bind(this);

    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
      </style>
      <h1>Hello World</h1>
      <img class="img-fluid" src="https://baconmockup.com/640/360"/>
    `;

    const preloader = this.shadowRoot.querySelector('img');

    preloader.addEventListener('load', () => {
      console.log('!!!! loAded');
      this.handleLoad();
    });
  }

  handleLoad() {
    console.log('loaded');
    this.#complete = true;

    const loadEvent = new CustomEvent('load');

    this.dispatchEvent(loadEvent); 
  }

  get complete() {
    return this.#complete;
  }

  connectedCallback() {
    console.log('connected');
  }
});
```

```html
<div class="frame">
  <x-preloader class="preloader">
    <h2>Load content</h2>
    <div class="d-flex">
      <img
        id="test"
        src="https://loremflickr.com/1280/640?lock=1234"
      />
      <img
        id="test"
        src="https://loremflickr.com/1280/640?lock=4321"
      />
    </div>
    <test-element></test-element>
  </x-preloader>
  <div class="spinner">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
</div>
```