class PlayButton extends HTMLButtonElement {
  constructor() {
    super();

    // this.attachShadow({ mode: "open" });

    // this.shadowRoot.innerHTML = `
    //   <style>
    //     :host {
          
    //     }
    //   </style>
    //   <slot name="play"></slot>
    //   <slot name="pause"></slot>
    // `;

    this.handleClick = this.handleClick.bind(this);
    this.handlePlayPause = this.handlePlayPause.bind(this);
  }

  handleClick(event) {
    if (!this.targetElement) {
      return;
    }

    !this.targetElement.paused ? this.targetElement.pause() : this.targetElement.play();
    
    // this.render();
  }

  handlePlayPause(event) {
    this.update();
  }

  connectedCallback() {
    this.addEventListener("click", this.handleClick);
   
    const elToWatch = this.targetElement;
    const parent = elToWatch.parentNode;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation)  => {
        if (mutation.type === 'childList') {
          if (!document.documentElement.contains(elToWatch)) {
            console.log('REMOVED', this);
            elToWatch.removeEventListener('play', this.handlePlayPause);
            elToWatch.removeEventListener('pause', this.handlePlayPause);
          }
        }
      });
    });
    
    this.observer.observe(parent, { childList: true, subtree: true});

    console.log('connectedCallback', this.targetElement);

    this.targetElement.addEventListener('play', this.handlePlayPause);
    this.targetElement.addEventListener('pause', this.handlePlayPause);

    this.update();
  }

  detachedCallback() {
    this.removeEventListener('click', this.handleClick);

    if (this.targetElement) {
      this.targetElement.removeEventListener('play', this.handlePlayPause);
      this.targetElement.removeEventListener('pause', this.handlePlayPause);
    }
  }

  update() {
    if (!this.targetElement) {
      return;
    }

    const isPlaying = !this.targetElement.paused;
    
    this.querySelector('[slot="play"]').hidden = isPlaying;
    this.querySelector('[slot="pause"]').hidden = !isPlaying;
  }

  get targetElement() {
    const selector = this.dataset.target || this.getAttribute('target') || 'video';

    return document.querySelector(selector);
  }
}

customElements.define("x-play-button", PlayButton, { extends: 'button' });

export default PlayButton;