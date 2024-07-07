import { Preloader } from "../../index.mjs";

export default class Ambience extends HTMLElement {
  #poster;
  #slot;
  #backdrop;
  #canvas;
  #mediaElement;

  static MEDIA_CLASSES = [HTMLImageElement, HTMLVideoElement];
  
  constructor() {
    super();

    this.handleResize = this.handleResize.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.update = this.update.bind(this);

    this.attachShadow({ mode: "open" });

    // this.backdrop = document.createElement("div");

    // this.canvas = document.createElement("canvas");
    // this.backdrop.appendChild(this.canvas);

    // this.backdrop.style.outline = '1px solid red';
    // this.backdrop.style.position = "absolute";
    // this.backdrop.style.top = "0";
    // this.backdrop.style.left = "0";
    // this.backdrop.style.right = "0";
    // this.backdrop.style.bottom = "0";
    // this.backdrop.style.zIndex = "-1";

    // this.canvas.style.position = "absolute";
    // this.canvas.style.top = "0";
    // this.canvas.style.left = "0";
    // this.canvas.style.right = "0";
    // this.canvas.style.bottom = "0";
   
    // const wrapper = document.createElement('div');

    // wrapper.style.position = "relative";
    // wrapper.style.display = "inline-block";
    
    // this.shadowRoot.appendChild(wrapper);

    // wrapper.appendChild(this.backdrop);

    // const content = document.createElement('div');

    // content.style.position = "relative";
    
    // wrapper.appendChild(content);

    // this.#slot = document.createElement('slot');
    
    // content.appendChild(this.#slot);

    // this.#poster = document.createElement("img");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
        }

        :host::part(backdrop) {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          filter: contrast(2) blur(3.5rem) opacity(0.5) brightness(2.7);
        }

        :host::part(poster) {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          outline: 2px solid red;
        }

        canvas {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
      </style>
      
     
      <div part="backdrop">
        <canvas part="canvas"></canvas>
      </div>
      
      <slot></slot>
    `;

    this.#slot = this.shadowRoot.querySelector('slot');
    this.#poster = this.shadowRoot.querySelector('[part="poster"]');
    this.#canvas = this.shadowRoot.querySelector('[part="canvas"]');
    this.#backdrop = this.shadowRoot.querySelector('[part="backdrop"]');
  }

  handleResize() {
    this.update();
  }

  handleSlotChange(event) {
    const mediaElement = event.target
      .assignedElements()
      .find(element => Ambience.MEDIA_CLASSES.includes(element.constructor));

    if (mediaElement !== this.#mediaElement) {
      if (this.#mediaElement) {
        // Remove Event Listeners
      }

      this.#mediaElement = mediaElement;

      if (this.#mediaElement) {
        // Add Event Listeners
      }
    }
  
    this.update();
  }

  connectedCallback() {
    window.addEventListener("resize", this.handleResize);
    this.#slot.addEventListener('slotchange', this.handleSlotChange);

    this.update();
  }

  detachedCallback() {
    window.removeEventListener("resize", this.handleResize);
  }

  update() {
    requestAnimationFrame(() => this.update()); // wait for the brow

    if (!this.targetElement) {
      return;
    }
  
    const t = this.targetElement; 

    const offset = 0;

    const style = getComputedStyle(t);
    const objectFit = style.objectFit;
    const borderRadius = style.borderRadius;
    
    this.#canvas.style.transform = "";

    const ctx = this.#canvas.getContext("2d");

    const v = this.targetElement;

    const isPoster = this.targetElement.poster && !this.targetElement.played.length;

    if (isPoster) {
      this.#backdrop.style.background = `url(${this.targetElement.poster}) no-repeat center center / cover`;
      return;
    }

    const f = 1 + offset / 100;
    const b = this.targetElement.getBoundingClientRect();
    const w = b.width;
    const h = b.height;
    
    this.#canvas.width = w;
    this.#canvas.height = h;
  
    const sx = 0;
    const sy = 0;

    const sw = v.videoWidth || v.offsetWidth;
    const sh = v.videoHeight || v.offsetHeight;
  
    var hRatio = w / sw;
    var vRatio = h / sh;
    var ratio  = objectFit === 'cover' ? Math.max ( hRatio, vRatio ) : Math.min ( hRatio, vRatio );
  
    const dx = (( w - sw * ratio / f ) / 2);
    const dy = (( h - sh * ratio / f ) / 2);
    const dw = sw * ratio / f;
    const dh = sh * ratio / f;
  
    ctx.clearRect(0, 0, w, h);

    const [,borderTopLeftValue, borderTopLeftUnit] = style.borderTopLeftRadius.match(/(\d+)(px|%)/);
    const borderTopLeftRadius = borderTopLeftUnit === 'px' ? borderTopLeftValue : borderTopLeftValue * w / 100;
    const [,borderTopRightValue, borderTopRightUnit] = style.borderTopRightRadius.match(/(\d+)(px|%)/);
    const borderTopRightRadius = borderTopRightUnit === 'px' ? borderTopRightValue : borderTopRightValue * w / 100;
    const [,borderBottomLeftValue, borderBottomLeftUnit] = style.borderBottomLeftRadius.match(/(\d+)(px|%)/);
    const borderBottomLeftRadius = borderBottomLeftUnit === 'px' ? borderBottomLeftValue : borderBottomLeftValue * w / 100;
    const [,borderBottomRightValue, borderBottomRightUnit] = style.borderBottomRightRadius.match(/(\d+)(px|%)/);
    const borderBottomRightRadius = borderBottomRightUnit === 'px' ? borderBottomRightValue : borderBottomRightValue * w / 100;

    const tlr = borderTopLeftRadius;
    const trr = borderTopRightRadius;
    const blr = borderBottomLeftRadius;
    const brr = borderBottomRightRadius;

    ctx.strokeStyle = "transparent";
    ctx.beginPath();
    ctx.roundRect(dx, dy, dw, dh, [tlr, trr, blr, brr]);
    ctx.stroke();

    ctx.clip();

    ctx.drawImage(
      v,
      sx, sy, sw, sh,
      dx, dy, dw, dh
    );
  }

  get targetElement() {
    const target = this.dataset.target;

    if (target) {
      return document.querySelector(target);
    }

    const element = this.querySelector('img, video');

    return element;
  }
}

customElements.define('x-ambience', Ambience);