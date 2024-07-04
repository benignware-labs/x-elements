import { Preloader } from "../../index.mjs";

export default class Ambience extends HTMLElement {
  constructor() {
    super();

    this.handleResize = this.handleResize.bind(this);
    this.render = this.render.bind(this);

    this.canvas = document.createElement("canvas");

    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.right = "0";
    this.canvas.style.bottom = "0";
    // this.canvas.style.border = "1px solid red";

    const shadow = this.attachShadow({ mode: "open" });

    const wrapper = document.createElement('div');

    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    shadow.appendChild(wrapper);

    wrapper.appendChild(this.canvas);

    const content = document.createElement('div');

    content.style.position = "relative";
    
    wrapper.appendChild(content);

    const slot = document.createElement('slot');
    
    content.appendChild(slot);
  }

  handleResize() {
    this.render();
  }

  connectedCallback() {
    window.addEventListener("resize", this.handleResize);

    this.render();
  }

  detachedCallback() {
    window.removeEventListener("resize", this.handleResize);
  }

  render() {
    if (!this.targetElement) {
      return;
    }

    const offset = 0;

    const style = getComputedStyle(this.targetElement);
    const objectFit = style.objectFit;
    const borderRadius = style.borderRadius;

    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "-1";
    
    this.canvas.style.transform = "";

    const ctx = this.canvas.getContext("2d");

    const v = this.targetElement;
    const f = 1 + offset / 100;
    const b = this.targetElement.getBoundingClientRect();
    const w = b.width;
    const h = b.height;
    
    this.canvas.width = w;
    this.canvas.height = h;
  
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

    this.canvas.style.filter = this.dataset.filter || 'contrast(4) blur(3.5rem) opacity(0.5) brightness(2.7) saturate(0.5)';

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

    // if (this.targetElement.tagName === 'VIDEO') {
      requestAnimationFrame(() => this.render()); // wait for the brow
    // }
  }

  // static get observedAttributes() {
  //   return ['target'];
  // }
  
  // attributeChangedCallback(name, oldValue, newValue) {
  //   if (oldValue === newValue) return;

  //   this.render();
  // }

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