export default class Ambience extends HTMLElement {
  #slot;
  #backdrop;
  #canvas;
  #mediaElement;
  #isPlaying;

  static MEDIA_TAGS = ['video', 'img'];
  
  constructor() {
    super();

    this.handleResize = this.handleResize.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.update = this.update.bind(this);

    this.attachShadow({ mode: "open" });

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
    this.#canvas = this.shadowRoot.querySelector('[part="canvas"]');
    this.#backdrop = this.shadowRoot.querySelector('[part="backdrop"]');
  }

  handleResize() {
    this.update();
  }

  handleSlotChange(event) {
    const mediaElement = [...event.target.assignedElements()].reduce((mediaElement, element) => {
      if (!mediaElement) {
        mediaElement = Ambience.MEDIA_TAGS.includes(element.tagName.toLowerCase())
          ? element
          : element.querySelector(Ambience.MEDIA_TAGS.join(', '));
      }

      return mediaElement;
    }, null);

    if (mediaElement !== this.#mediaElement) {
      if (this.#mediaElement) {
        // Remove Event Listeners
        this.#mediaElement.removeEventListener('play', this.handlePlay);
        this.#mediaElement.removeEventListener('pause', this.handlePause);
        this.#mediaElement.removeEventListener('loadeddata', this.update);
        this.#mediaElement.removeEventListener('load', this.update);
      }

      this.#mediaElement = mediaElement;

      if (this.#mediaElement) {
        // Add Event Listeners
        this.#mediaElement.addEventListener('play', this.handlePlay);
        this.#mediaElement.addEventListener('pause', this.handlePause);
        this.#mediaElement.addEventListener('loadeddata', this.update);
        this.#mediaElement.addEventListener('load', this.update);
      }
    }
  
    this.update();
  }

  handlePlay() {
    this.#isPlaying = true;
    this.update();
  }

  handlePause() {
    this.#isPlaying = false;
  }

  connectedCallback() {
    window.addEventListener("resize", this.handleResize);
    this.#slot.addEventListener('slotchange', this.handleSlotChange);

    this.update();
  }

  detachedCallback() {
    window.removeEventListener("resize", this.handleResize);
    this.#slot.removeEventListener('slotchange', this.handleSlotChange);
  }

  update() {
    if (!this.#mediaElement) {
      return;
    }

    if (!this.#mediaElement.paused) {
      requestAnimationFrame(this.update);
    }

    const offset = 0;

    const v = this.#mediaElement;

    const f = 1 + offset / 100;
    const b = v.getBoundingClientRect();
    const w = b.width;
    const h = b.height;

    this.#canvas.width = `${w}`;
    this.#canvas.height = `${h}`;
    
    const ctx = this.#canvas.getContext("2d");

    const isImage = this.#mediaElement instanceof HTMLImageElement
      || this.#mediaElement.poster && !this.#mediaElement.played.length;

    const style = getComputedStyle(this.#mediaElement);
    const objectFit = style.objectFit;

  
    if (isImage) {
      const src = this.#mediaElement.poster || this.#mediaElement.src || this.#mediaElement.currentSrc;

      this.#backdrop.style.background = `url(${src})`;
      this.#backdrop.style.backgroundSize = objectFit;
      return;
    }

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
}

customElements.define('x-ambience', Ambience);