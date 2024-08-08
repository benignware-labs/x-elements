import { MediaControlsList } from './MediaControlsList.mjs';

const formatCurrentTime = (time, duration) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default class MediaControls extends HTMLElement {
  #internals;
  #slot;
  #mediaElement;
  #containerElement;

  // Timeouts
  #clickTimeout;
  #autohideTimeout;

  // Wrapper
  #body;
  #controlsFrame;

  // Control References
  #playButton;
  #muteButton;
  #fullscreenButton;
  #timeline;
  #volumeSlider;
  #currentTimeDisplay;
  #durationDisplay;

  // Attributes
  #controls = null;
  #controlslist = null;
  #for;

  // Since we can't hide native media-controls by css in Firefox, we need to keeep track of the controls attribute
  #hasElementControls = false;
  #elementControlsObserver = null;
  #elementControlsObserverEnabled = true;

  static MEDIA_SELECTOR = 'video, audio';
  static CONTROLS_TIMEOUT = 3000;

  constructor() {
    super();

    this.handleResize = this.handleResize.bind(this);
    this.handleSlotChange = this.handleSlotChange.bind(this);
  
    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleVolumeChange = this.handleVolumeChange.bind(this);
    this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
    this.handleLoadedData = this.handleLoadedData.bind(this);
    this.handleCanPlay = this.handleCanPlay.bind(this);

    this.handlePlayButtonClick = this.handlePlayButtonClick.bind(this);
    this.handleMuteButtonClick = this.handleMuteButtonClick.bind(this);
    this.handleFullscreenButtonClick = this.handleFullscreenButtonClick.bind(this);
  
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleTimelineChange = this.handleTimelineChange.bind(this);
    this.handleVolumeSliderChange = this.handleVolumeSliderChange.bind(this);

    this.handleElementClick = this.handleElementClick.bind(this);
    this.handleElementDblClick = this.handleElementDblClick.bind(this);
    
    // this.handleDblClick = this.handleDblClick.bind(this);
    
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    
    this.handleControlsListChange = this.handleControlsListChange.bind(this);
    this.handleElementControlsChanged = this.handleElementControlsChanged.bind(this);

    this.update = this.update.bind(this);

    this.attachShadow({ mode: "open" });
    this.#internals = this.attachInternals();

    this.#controlslist = new MediaControlsList(this.handleControlsListChange);

    this.#elementControlsObserver = new MutationObserver(this.handleElementControlsChanged.bind(this));

    const html = `
      <style>
        :host {
          display: block;
          position: relative;
          font-family: var(--x-font-family, sans-serif);
          font-size: var(--x-font-size, 0.9rem);
        }

        /*:host slot {
          display: block;
          overflow: hidden;
          pointer-events: none;
          outline: 2px solid red;
        }*/

        :host([for]) {
          display: block;
          overflow: visible;
        }

        :host::part(body) {
          position: relative;
          display: flex;
        }

        :host::part(controls-frame) {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          pointer-events: none;
        }

        /* controls panel */
        :host::part(controls-panel) {
          pointer-events: auto;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--x-controls-bg, color-mix(in srgb, black 45%, transparent));
          transition-delay: 0s;
          padding: var(--x-controls-padding-y, 0.5rem) var(--x-controls-padding-x, 0.5rem);
          
          /*gap: var(--x-controls-gap, 0.5rem);*/
        }

        :host::part(controls-panel) {
          transform: translateY(
            calc(
              100% * var(--x-controls-slide, 1) +
              0% * (1 - var(--x-controls-slide, 1))
            )
          );
          opacity: calc(
            0 * var(--x-controls-fade, 1) +
            1 * (1 - var(--x-controls-fade, 1))
          );
        }

        :host::part(controls-panel-body) {
          display: flex;
          justify-content: start;
          align-items: center;
          margin-left: calc(var(--x-controls-gap, 0.5rem) / 2 * -1);
          margin-right: calc(var(--x-controls-gap, 0.5rem) / 2 * -1);
        }

        :host::part(control) {
          padding-left: calc(var(--x-controls-gap, 0.5rem) / 2);
          padding-right: calc(var(--x-controls-gap, 0.5rem) / 2);
          box-sizing: border-box;
          outline: 1px solid red;
          height: 1rem;
        }

        :host(:state(--nocontrols))::part(overlay-playbutton),
        :host(:state(--nocontrols))::part(controls-panel) {
          display: none;
        }

        :host(:state(--animated))::part(controls-panel) {
          transition: transform 0.3s ease-in, opacity 0.3s ease-in;
        }

        :host(:state(--paused))::part(controls-panel) {
        }

        :host(:state(--fullscreen))::part(controls-panel) {
        }

        :host(:state(--controlsvisible))::part(controls-panel) {
          transform: translateY(0);
          transition-delay: 0.1s;
          opacity: 1;
        }

        /* sliders */
        :host::part(slider) {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          display: block;
          /*width: max-content;
          flex-grow: 1;
          flex-shrink: 1; */
          pointer-events: auto;
          margin: 0;
        }

        :host::part(timeline) {
          min-width: 65px;
          flex-grow: 1;
          flex-shrink: 1;
        }

        ${[
          '-webkit-slider-runnable-track',
          '-moz-range-track'
        ].map(selector => `
          *::${selector} {
            width: 100%;
            height: var(--x-slider-height, 0.5rem);
            cursor: pointer;
            box-shadow: var(--x-slider-shadow, inset 0 1px 2px color-mix(in srgb, black 5%, transparent));
            background: var(--x-slider-bg, color-mix(in srgb, var(--x-controls-color, #fff) 50%, transparent));
            border-radius: var(--x-slider-radius, 0.5rem);
            border-width: var(--x-slider-border-width, 0);
            border-style: var(--x-slider-border-style, solid);
            border-color: var(--x-slider-border-color, #010101);
            display: flex;
          }
          
          input[type=range]:focus::${selector} {
            /*background: initial;*/
          }
        `).join('\n')}

        ${[
          '-webkit-slider-thumb',
          '-moz-range-thumb'
        ].map(selector => `
          *::${selector} {
            -webkit-appearance: none;
            appearance: none;
            width: var(--x-slider-thumb-width, 0.5rem); 
            height: var(--x-slider-thumb-height, 0.5rem);
            border-radius: 50%;
            background: var(--x-controls-color, #fff);
            cursor: pointer;
            margin-top: calc((var(--x-slider-height, 0.5rem) - var(--x-slider-thumb-height, 0.5rem)) / 2);
          }
        `).join('\n')}

        /* control buttons */
        :host::part(control-button) {
          aspect-ratio: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          line-height: 1;
          height: 1rem;
          box-sizing: content-box;
          cursor: pointer;
          pointer-events: auto;
        }

        :host::part(control-button):before,
        :host::part(overlay-playbutton):before,
        :host::part(control-button):after {
          font-family: var(--x-icon-font-family, monospace);
          font-weight: var(--x-icon-font-weight, normal);
        }

        /* fullscreen button */
        :host::part(fullscreen-button) {
          grid-area: fullscreen-button;
          margin-left: auto;
        }

        :host::part(fullscreen-button)::before {
          content: var(--x-icon-expand, '⛶');
        }

        :host(:state(--fullscreen))::part(fullscreen-button)::before {
          content: var(--x-icon-collapse, '⛶');
        }

        /* play button */
        :host::part(play-button) {
        }

        :host(:state(--paused))::part(play-button):before {
          content: var(--x-icon-play, "▶");
        }

        :host::part(play-button):before {
          content: var(--x-icon-pause, '⏸');
        }

        /* mute button */
        :host::part(mute-button) {
          position: relative;
        }

        :host::part(mute-button):before {
          content: var(--x-icon-unmute, "\\1F50A");
        }

        :host(:state(--muted))::part(mute-button):before {
          /* content: var(--x-icon-mute, '🔇'); */
        }

        :host(:state(--muted))::part(mute-button):after {
          /*content: var(--x-icon-strike, '\\2298');*/
          content: '';
          display: block;
          position: absolute;
          left: 0;
          top: 0;
          height: 1rem;
          aspect-ratio: 1;
          color: red;
          font-size: 2rem;
          width: 1rem;
          background: linear-gradient(to right top, transparent, transparent 40%, #eee 40%, #eee 50%, #333 50%, #333 60%, transparent 60%, transparent);
        }

        :host::part(time-display) {
          display: flex;
          flex-wrap: nowrap;
          white-space: nowrap;
        }

        /* duration-display */
        :host::part(duration) {
          color: var(--x-muted, color-mix(in srgb, var(--x-controls-color, #fff) 50%, transparent));
        }

        :host::part(duration)::before {
          content: ' / ';
        }

        /* current-time-display */
        :host::part(current-time) {
        }

        :host::part(display) {
          
        }

        :host::part(duration):empty {
          display: none;
        }

        /* overlay play button */
        :host::part(overlay-playbutton) {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: all 0.3s ease-in;
          padding: 1.3rem;
          font: var(--x-icon-font, monospace);
          font-size: 2rem;
          background: var(--x-controls-bg, color-mix(in srgb, black 45%, transparent));
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          box-sizing: content-box;
          cursor: pointer;
          text-align: center;
          opacity: 0.5;
          transition: all 0.09s linear;
          visibility: hidden;
          aspect-ratio: 1;
          height: 1em;
        }

        :host::part(overlay-playbutton)::before {
          content: var(--x-icon-play, "▶");
          display: block;
          vertical-align: middle;
        }

        :host(:state(--canplay):state(--paused):not(:state(--played)))::part(overlay-playbutton) {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
          visibility: visible;
        }

        :host(:state(--played))::part(overlay-playbutton) {
          opacity: 0;
          transform: translate(-50%, -50%) scale(2.5);
          transition: visibility 0s 0.4s, opacity 0.4s ease-out, transform 0.4s ease-in;
          visibility: hidden;
          pointer-events: none;
          cursor: default;
        }

        /* volume-control */
        .volume-control {
          display: flex;
          align-items: center;
          position: relative;
          /*margin-right: 0;*/
          pointer-events: auto;
        }

        .mute-button ~ input[type=range] {
          transition: all 0.2s ease-in;
          width: 120px;
        }

        .mute-button {
          outline: 1px solid green !important;
        }

        .mute-button ~ input[type=range] {
          outline: 1px solid pink !important;
        }

        .mute-button ~ input[type=range] {
          max-width: calc(
            var(--x-volume-slider--width, 60px) * var(--x-volume-slider-expand, 1) +
            0px * (1 - var(--x-volume-slider-expand, 1))
          );
          opacity: calc(
            1 * var(--x-volume-slider-expand, 1) +
            0 * (1 - var(--x-volume-slider-expand, 1))
          );;
          padding-left: calc(
            0px * var(--x-volume-slider-expand, 1) +
            var(--x-controls-gap, 0.5rem) / 2 * (1 - var(--x-volume-slider-expand, 1))
          );
          padding-right: calc(
            0px * var(--x-volume-slider-expand, 1) +
            var(--x-controls-gap, 0.5rem) / 2 * (1 - var(--x-volume-slider-expand, 1))
          );
        } 

        .mute-button:hover ~ input[type=range],
        .mute-button ~ input[type=range]:hover {
          outline: 1px solid yellow !important;
          opacity: 1;
          max-width: var(--x-volume-slider--width, 60px);
          padding-left: 0.5rem;
        }

        /* controlslist */
      
        ${
          Object.entries({
            'play-button': ['noplay', 'noplaybutton'],
            'overlay-playbutton': ['noplay', 'nooverlayplaybutton'],
            'fullscreen-button': ['nofullscreen', 'nofullscreenbutton'],
            'mute-button': ['novolume', 'nomutebutton'],
            'volume-slider': ['novolume', 'novolumeslider'],
            'current-time': ['notime', 'nocurrenttime'],
            'duration': ['notime', 'noduration'],
            'timeline': ['notime', 'notimeline'],

          }).map(([part, triggers]) => `
            :host(:where(
              ${triggers.map(trigger => `
                [controlslist="${trigger}"],
                [controlslist^="${trigger} "],
                [controlslist*=" ${trigger} "],
                [controlslist$=" ${trigger}"]
              `).join(',\n')}
            ))::part(${part}) {
              /*outline: 2px solid blue;*/
              /*display: none;*/
              ${triggers.map(trigger => `--x-controlslist--${trigger}: 1;`).join('\n')}
            }

            :host::part(${part}) {
              --x-controlslist--novalue: ${triggers.reduce((acc, trigger) => `var(--x-controlslist--${trigger}, ${acc})`, '0')};
              overflow: hidden;
              /*max-width: calc(
                0px * var(--x-controlslist--novalue, 0) +
                1000px * (1 - var(--x-controlslist--novalue, 0))
              );
              padding-left: calc(
                0px * var(--x-controlslist--novalue, 0) +
                var(--x-controls-gap, 0.5rem) / 2 * (1 - var(--x-controlslist--novalue, 0))
              );
              padding-right: calc(
                0px * var(--x-controlslist--novalue, 0) +
                var(--x-controls-gap, 0.5rem) / 2 * (1 - var(--x-controlslist--novalue, 0))
              );*/
              /*outline: calc(
                5px * var(--x-controlslist--novalue, 0) +
                0px * (1 - var(--x-controlslist--novalue, 0))
              ) solid yellow;*/
            }
          `).join('\n')
        }


        /*
        :host([controlslist*="nofullscreen"])::part(fullscreen-button),
        :host([controlslist*="nooverlayplaybutton"])::part(overlay-playbutton),
        :host([controlslist*="noplaybutton"])::part(play-button),
        :host([controlslist*="nomutebutton"])::part(mute-button),
        :host([controlslist*="notimeline"])::part(timeline),
        :host([controlslist*="noduration"])::part(duration),
        :host([controlslist*="nocurrenttime"])::part(current-time),
        :host([controlslist*="novolumeslider"])::part(volume-slider) {
          display: none;
        }
        

        :host(:where(
          [controlslist^="noplaybutton"],
          [controlslist*=" noplaybutton "],
          [controlslist$="noplaybutton"],
          [controlslist^="noplay"],
          [controlslist*=" noplay "],
          [controlslist$="noplay"],
        ))::part(play-button),
        
        :host(:where(
          [controlslist^="nooverlayplaybutton"],
          [controlslist*=" nooverlayplaybutton "],
          [controlslist$="nooverlayplaybutton"],
          [controlslist^="noplay"],
          [controlslist*=" noplay "],
          [controlslist$="noplay"],
        ))::part(overlay-playbutton),

        :host(:where(
          [controlslist^="nofullscreenbutton"],
          [controlslist*=" nofullscreenbutton "],
          [controlslist$="nofullscreenbutton"],
          [controlslist^="nofullscreen"],
          [controlslist*=" nofullscreen "],
          [controlslist$="nofullscreen"],
        ))::part(fullscreen-button),

        :host(:where(
          [controlslist^="nomutebutton"],
          [controlslist*=" nomutebutton "],
          [controlslist$="nomutebutton"],
          [controlslist^="novolume"],
          [controlslist*=" novolume "],
          [controlslist$="novolume"],
        ))::part(mute-button),

        :host(:where(
          [controlslist^="novolumeslider"],
          [controlslist*=" novolumeslider "],
          [controlslist$="novolumeslider"],
          [controlslist^="novolume"],
          [controlslist*=" novolume "],
          [controlslist$="novolume"],
        ))::part(volume-slider),

        :host(:where(
          [controlslist^="nocurrenttime"],
          [controlslist*=" nocurrenttime "],
          [controlslist$="nocurrenttime"],
          [controlslist^="notime"],
          [controlslist*=" notime "],
          [controlslist$="notime"],
        ))::part(current-time),

        :host(:where(
          [controlslist^="noduration"],
          [controlslist*=" noduration "],
          [controlslist$="noduration"],
          [controlslist^="notime"],
          [controlslist*=" notime "],
          [controlslist$="notime"],
        ))::part(duration),

        :host(:where(
          [controlslist^="notimeline"],
          [controlslist*=" notimeline "],
          [controlslist$="notimeline"],
          [controlslist^="notime"],
          [controlslist*=" notime "],
          [controlslist$="notime"],
        ))::part(timeline)
        
        {
          display: none;
        }

        :host::part(play-button) {
          position: relative;
        }

        :host::part(play-button) {
          left: calc(
            1000vw * var(--x-controlslist--noplaybutton, 0) +
            0vw * (1 - var(--x-controlslist--noplaybutton, 0))
          );;
        }

        */
      </style>
      <div part="body">
        <slot></slot>
        <div part="controls-frame">
          <div part="controls-panel">
            <div part="controls-panel-body">
              <div part="control control-button play-button"></div>

              <input part="control slider timeline" type="range"/>
              <div part="control display current-time">0:00</div>
              <div part="control display duration">0:00</div>

              <div class="mute-button" part="control control-button mute-button"></div>
              <input part="control slider volume-slider" type="range"/>
              
              <div part="control control-button fullscreen-button"></div>
            </div>
          </div>
          <div part="overlay-playbutton"></div>
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = html;

    this.#slot = this.shadowRoot.querySelector('slot');
    this.#body = this.shadowRoot.querySelector('[part*="body"]');
    this.#controlsFrame = this.shadowRoot.querySelector('[part*="controls-frame"]');
    
    // Controls
    this.#playButton = this.shadowRoot.querySelector('[part*="play-button"]');
    this.#muteButton = this.shadowRoot.querySelector('[part*="mute-button"]');
    this.#fullscreenButton = this.shadowRoot.querySelector('[part*="fullscreen-button"]');
    this.#timeline = this.shadowRoot.querySelector('[part*="timeline"]');
    this.#currentTimeDisplay = this.shadowRoot.querySelector('[part*="current-time"]');
    this.#durationDisplay = this.shadowRoot.querySelector('[part*="duration"]');
    this.#volumeSlider = this.shadowRoot.querySelector('[part*="volume-slider"]');
    this.#volumeSlider.value = 100;
  }

  setTargetElement(targetElement) {
    console.log('set target element', targetElement);
    const containerElement = this.contains(targetElement) ? this.#body : targetElement;

    console.log('targetElement: ', targetElement);
    // if (targetElement !== this.#containerElement) {

      if (this.#containerElement) {
        // Remove event listeners
        this.#containerElement.removeEventListener('pointermove', this.handlePointerMove);
        this.#containerElement.removeEventListener('pointerleave', this.handlePointerLeave);
      }

      this.#containerElement = containerElement;

      if (this.#containerElement) {
        // Add event listeners
        this.#containerElement.addEventListener('pointermove', this.handlePointerMove);
        this.#containerElement.addEventListener('pointerleave', this.handlePointerLeave);
      }
      
      let mediaElement = null;

      if (targetElement) {
          mediaElement = targetElement.matches(MediaControls.MEDIA_SELECTOR)
          ? targetElement
          : targetElement.querySelector(MediaControls.MEDIA_SELECTOR);
      }

      this.mediaElement = mediaElement;
    // }
  }

  getTargetElement() {
    return this.#containerElement;
  }

  set mediaElement(value) {
    if (value !== this.#mediaElement) {
      if (this.#mediaElement) {
        this.#mediaElement.removeEventListener('loadeddata', this.handleLoadedData);
        this.#mediaElement.removeEventListener('canplay', this.handleCanPlay);
        this.#mediaElement.removeEventListener('play', this.handlePlay);
        this.#mediaElement.removeEventListener('pause', this.handlePause);
        this.#mediaElement.removeEventListener('timeupdate', this.handleTimeUpdate);
        this.#mediaElement.removeEventListener('durationchange', this.handleTimeUpdate);
        this.#mediaElement.removeEventListener('volumechange', this.handleVolumeChange);

        
        this.#mediaElement.removeEventListener('click', this.handleElementClick);
        this.#mediaElement.removeEventListener('dblclick', this.handleElementDblClick);

        this.#elementControlsObserver.disconnect();
      }

      this.#mediaElement = value;

      if (this.#mediaElement) {
        this.#mediaElement.addEventListener('loadeddata', this.handleLoadedData);
        this.#mediaElement.addEventListener('canplay', this.handleCanPlay);
        this.#mediaElement.addEventListener('play', this.handlePlay);
        this.#mediaElement.addEventListener('pause', this.handlePause);
        this.#mediaElement.addEventListener('timeupdate', this.handleTimeUpdate);
        this.#mediaElement.addEventListener('durationchange', this.handleTimeUpdate);
        this.#mediaElement.addEventListener('volumechange', this.handleVolumeChange);

        
        this.#mediaElement.addEventListener('click', this.handleElementClick);
        this.#mediaElement.addEventListener('dblclick', this.handleElementDblClick);


        console.log('init media element', this.#controls, this.#mediaElement.controls);

        this.handleElementControlsChanged();

        this.#elementControlsObserver.observe(this.#mediaElement, {
          attributes: true,
          attributeFilter: ['controls']
        });

        this.#mediaElement.muted ? this.#internals.states.add('--muted') : this.#internals.states.delete('--muted');
        this.#volumeSlider.value = this.#mediaElement.muted ? 0 : this.#mediaElement.volume * 100;

        if (this.#mediaElement.readyState === 0 && this.#mediaElement.autoplay || !this.#mediaElement.paused) {
          this.hideControls(0);
        } else {
          this.showControls();
        }

        if (this.#mediaElement.readyState >= 2) {
          this.#timeline.max = 100;
          this.#internals.states.add('--loadeddata');

          if (this.#mediaElement.readyState >= 3) {
            this.#internals.states.add('--canplay');
          }
        }
      }
    }

    this.update();
  }

  get mediaElement() {
    return this.#mediaElement;
  }

  toggleFullscreen() {
    console.log('this.#containerElement: ', this.#containerElement);
    if (!document.fullscreenElement) {
      this.#containerElement.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  }

  handleSlotChange(event) {
    if (this.for) {
      return;
    }
    const targetElement = event.target
      .assignedElements()
      .find(element => element.matches(MediaControls.MEDIA_SELECTOR) || !!element.querySelector(MediaControls.MEDIA_SELECTOR));

    this.setTargetElement(targetElement);
  
    this.update();
  }

  handleResize() {
    this.update();
  }

  handlePlayButtonClick(event) {
    this.#mediaElement.paused ? this.#mediaElement.play() : this.#mediaElement.pause();
  }

  handleMuteButtonClick(event) {
    this.#mediaElement.muted = !this.#mediaElement.muted;
  }

  handleFullscreenButtonClick(event) {
    this.toggleFullscreen();
  }

  handleElementClick(event) {
    clearTimeout(this.#clickTimeout);
  
    if (event.detail === 1) {
      this.#clickTimeout = setTimeout(() => {
        this.handleElementSingleClick(event);
      }, 200)
    }
  }

  handleElementSingleClick(event) {
    const noPlay = !this.controls || this.controlslist.has('noplay');

    if (noPlay) {
      return;
    }

    this.#mediaElement.paused ? this.#mediaElement.play() : this.#mediaElement.pause();
  }

  handleElementDblClick(event) {
    if (event.target !== this.#mediaElement) {
      return;
    }

    this.toggleFullscreen();
  }

  handlePlay() {
    if (this.#mediaElement.played.length > 0) {
      this.#internals.states.add('--played');
    }

    this.hideControls();
    this.update();
  }

  handlePause() {
    this.showControls();
    this.update();
  }

  handleFullscreenChange() {
    const isAnimated = this.#internals.states.has('--animated');
    this.#internals.states.delete('--animated');
    this.update();
    this.handleControlsListChange();

    if (isAnimated) {
      this.#internals.states.add('--animated');
    }
  }

  handleTimelineChange(event) {
    if (!this.#mediaElement) {
      return;
    }

    const newTime = this.#mediaElement.duration * (event.target.value / 100);

    this.#mediaElement.currentTime = newTime;

    this.update();
  }

  handleVolumeChange() {
    const isMuted = this.#mediaElement.muted;
    const volume = isMuted ? 0 : this.#mediaElement.volume;

    this.#volumeSlider.value = volume * 100;

    if (volume === 0) {
      this.#internals.states.add('--muted');
    } else {
      this.#internals.states.delete('--muted');
    }
  }

  handleVolumeSliderChange(event) {
    if (!this.#mediaElement) {
      return;
    }
    
    this.#mediaElement.volume = event.target.value / 100;
    this.#mediaElement.muted = event.target.value > 0 ? false : true;

    this.handleVolumeChange();
  }

  handlePointerMove(event) {
    if (this.#autohideTimeout) {
      clearTimeout(this.#autohideTimeout);
    }

    this.#internals.states.add('--controlsvisible');

    if (this.#mediaElement.paused) {
      return;
    }

    const originalTarget = event.composedPath()[0];
    const isControls = !!originalTarget.closest('[part*="controls"]');

    if (isControls) {
      return;
    }

    this.#autohideTimeout = setTimeout(() => {
      this.#internals.states.delete('--controlsvisible');
    }, MediaControls.CONTROLS_TIMEOUT);
  }

  handlePointerLeave(event) {
    if (this.#autohideTimeout) {
      clearTimeout(this.#autohideTimeout);
    }

    if (this.#mediaElement.paused) {
      return;
    }

    this.#internals.states.delete('--controlsvisible');
  }

  handleLoadedData(e) {
    this.#timeline.max = 100;
    this.#internals.states.add('--loadeddata');
    this.#internals.states.add('--animated');
    this.update();
  }

  handleCanPlay(e) {
    this.#internals.states.add('--canplay');
    this.update();
  }

  handleTimeUpdate() {
    const value = (100 / this.#mediaElement.duration) * this.#mediaElement.currentTime;

    if (isNaN(value)) {
      return;
    }

    this.#timeline.value = value;
    this.#currentTimeDisplay.textContent = formatCurrentTime(this.#mediaElement.currentTime, this.#mediaElement.duration);
    this.#durationDisplay.textContent = formatCurrentTime(this.#mediaElement.duration);
  }

  handleElementControlsChanged() {
    if (!this.#elementControlsObserverEnabled) {
      return;
    }

    this.#hasElementControls = this.#mediaElement.hasAttribute('controls');

    this.update();

    this.#elementControlsObserverEnabled = false;
    this.#mediaElement.controls = false;
    this.#elementControlsObserverEnabled = true;
  }

  handleControlsListChange() {
    const controls = this.shadowRoot.querySelectorAll('[part="controls-panel"] *[part]');
    const hasVisibleControls = Array.from(controls).some(control => getComputedStyle(control).display !== 'none');

    if (!hasVisibleControls) {
      this.#internals.states.add('--nocontrols');
    } else {
      this.#internals.states.delete('--nocontrols');
    }

    if (!this.#mediaElement) {
      return;
    }

    if (this.controlslist.has('noplay')) {
      const isPlaying = this.#mediaElement.hasAttribute('autoplay');

      if (isPlaying) {
        this.#mediaElement.play();
      } else {
        this.#mediaElement.pause();
      }
    }

    if (this.controlslist.has('novolume') || this.controlslist.has('nomutebutton') && this.controlslist.has('novolumeslider')) {
      const isMuted = this.#mediaElement.hasAttribute('muted');

      this.#mediaElement.muted = isMuted;
    }
  }

  connectedCallback() {
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    this.#slot.addEventListener('slotchange', this.handleSlotChange);

    this.#playButton.addEventListener('click', this.handlePlayButtonClick);
    this.#muteButton.addEventListener('click', this.handleMuteButtonClick);
    this.#fullscreenButton.addEventListener('click', this.handleFullscreenButtonClick);

    // this.shadowRoot.addEventListener('click', this.handleClick);
    // this.shadowRoot.addEventListener('dblclick', this.handleDblClick);
    // this.addEventListener('pointermove', this.handlePointerMove);
    // this.addEventListener('pointerleave', this.handlePointerLeave);

    this.#timeline.addEventListener('change', this.handleTimelineChange);
    this.#volumeSlider.addEventListener('change', this.handleVolumeSliderChange);

    this.update();
  }

  detachedCallback() {
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    this.#slot.addEventListener('slotchange', this.handleSlotChange);

    this.#playButton.removeEventListener('click', this.handlePlayButtonClick);
    this.#muteButton.removeEventListener('click', this.handleMuteButtonClick);
    this.#fullscreenButton.removeEventListener('click', this.handleFullscreenButtonClick);

    // this.shadowRoot.removeEventListener('click', this.handleClick);
    // this.shadowRoot.removeEventListener('dblclick', this.handleDblClick);
    // this.removeEventListener('pointermove', this.handlePointerMove);
    // this.removeEventListener('pointerleave', this.handlePointerLeave);


    this.#timeline.removeEventListener('change', this.handleTimelineChange);
    this.#volumeSlider.removeEventListener('change', this.handleVolumeSliderChange);

    this.setTargetElement(null);
  }

  hideControls(timeout = MediaControls.CONTROLS_TIMEOUT) {
    if (this.#autohideTimeout) {
      clearTimeout(this.#autohideTimeout);
    }

    if (MediaControls.CONTROLS_TIMEOUT === 0) {
      this.#internals.states.delete('--controlsvisible');
      return;
    }

    this.#autohideTimeout = setTimeout(() => {
      if (!this.#mediaElement.paused) {
        this.#internals.states.delete('--controlsvisible');
      }
    }, timeout);
  }

  showControls() {
    if (this.#autohideTimeout) {
      clearTimeout(this.#autohideTimeout);
    }

    this.#internals.states.add('--controlsvisible');
  }

  update() {
    if (!this.#mediaElement) {
      return;
    }

    const isPaused = this.#mediaElement.paused;
    const isFullscreen = document.fullscreenElement === this || document.fullscreenElement?.contains(this);
    
    if (isPaused) {
      this.#internals.states.add('--paused');
    } else {
      this.#internals.states.delete('--paused');
    }

    if (isFullscreen) {
      this.#internals.states.add('--fullscreen');
    } else {
      this.#internals.states.delete('--fullscreen');
    }

    const style = getComputedStyle(this.#mediaElement);

    this.#controlsFrame.style.setProperty('border-top-left-radius', style.getPropertyValue('border-top-left-radius'));
    this.#controlsFrame.style.setProperty('border-top-right-radius', style.getPropertyValue('border-top-right-radius'));
    this.#controlsFrame.style.setProperty('border-bottom-left-radius', style.getPropertyValue('border-bottom-left-radius'));
    this.#controlsFrame.style.setProperty('border-bottom-right-radius', style.getPropertyValue('border-bottom-right-radius'));

    this.#controlsFrame.style.setProperty('transform', '');

    if (this.#for) {
      const mediaElementBounds = this.#containerElement.getBoundingClientRect();

      this.#controlsFrame.style.setProperty('width', `${mediaElementBounds.width}px`);
      this.#controlsFrame.style.setProperty('height', `${mediaElementBounds.height}px`);

      const targetBounds = this.#controlsFrame.getBoundingClientRect();

      const top = mediaElementBounds.top - targetBounds.top;
      const left = mediaElementBounds.left - targetBounds.left;

      this.#controlsFrame.style.setProperty('transform', `translate(${left}px, ${top}px)`);
    }

    if (this.controls) {
      this.#internals.states.delete('--nocontrols');
    } else {
      this.#internals.states.add('--nocontrols');
    }
  }

  set for(value) {
    if (value !== this.for) {
      if (value) {
        this.setAttribute('for', value);
      } else {
        this.removeAttribute('for');
      }

      this.#for = value;

      if (this.#for) {
        const targetElement = document.querySelector(`#${this.#for}`);
        
        this.setTargetElement(targetElement);
      }
    }
  }

  get for() {
    return this.#for;
  }

  get controlslist() {
    return this.#controlslist;
  }

  set controls(value) {
    if (value !== this.#controls) {
      const attrValue = this.hasAttribute('controls') ? this.getAttribute('controls') : null;

      if (value !== attrValue) {
        this.setAttribute('controls', value);
      }

      this.#controls = value;

      console.log('SET CONTROLS: ', value, this.#mediaElement);

      if (this.#mediaElement) {
        this.#mediaElement.controls = false;
      }

      this.update();
    }
  }

  get controls() {
    if (this.#controls === null) {
      return this.#hasElementControls
    }

    return !!this.#controls;
  }

  static get observedAttributes() {
    return ['for', 'controlslist', 'controls'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'controlslist') {
      this.controlslist.clear();
      this.controlslist.add(newValue);

      return;
    }

    if (Reflect.has(this, name)) {
      const isBool = typeof (this[name]) === 'boolean';
      const value = isBool ? this.hasAttribute(name) : newValue;

      if (value !== this[name]) {
        this[name] = value;
      }
    }
  }
}

customElements.define('x-media-controls', MediaControls);