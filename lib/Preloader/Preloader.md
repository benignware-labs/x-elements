<!--
  dest: components/Preloader.html
-->

# Preloader

Helps with preloading media and components while visually indicating loading state.

## Example

<!-- Example -->


Create a custom web component which is implementing the loading interface

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
      <h4>Custom Element</h4>
      <img class="img-fluid" src="https://baconmockup.com/640/360"/>
    `;

    this.shadowRoot
      .querySelector('img')
      .addEventListener('load', this.handleLoad);
  }

  handleLoad() {
    this.#complete = true;
    this.dispatchEvent(new CustomEvent('load')); 
  }

  get complete() {
    return this.#complete;
  }
});
```



Let's give it some style.

```css
img {
  aspect-ratio: 16/9;
  max-width: 250px;
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

Provide the actual markup for the preloader.

```html
<div class="frame">
  <x-preloader class="preloader">
    <h4>Images</h4>
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