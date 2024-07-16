<!--
  dest: components/MediaControls.html
-->
# MediaControls

Consistent media controls across browsers


## Example

<!-- Example -->
```html
<x-media-controls controlslist="">
  <video
    style="width: 100%; height: auto;"
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    poster="https://picsum.photos/id/211/800/450"
    loop
    onloadedmetadata="//this.muted = true // Firefox won't autplay when initially muted "
    muted
  ></video>
</x-media-controls>
```

## Example: "for"-Attribute

<!-- Example -->

```html
<video
  id="testvideo"
  style="width: 100%; height: auto; border-radius: 15px; "
  src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  poster="https://picsum.photos/id/211/800/450"
  loop
  onloadedmetadata="//this.muted = true // Firefox won't autplay when initially muted "
  muted
></video>
<x-media-controls for="testvideo"/>
```

## Example: ControlsList

<!-- Example -->

```html
<x-media-controls controlslist="notime novolume nofullscreen">
  <video
    style="width: 100%; height: auto;"
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    poster="https://picsum.photos/id/211/800/450"
    loop
    onloadedmetadata="//this.muted = true // Firefox won't autplay when initially muted "
    muted
  ></video>
</x-media-controls>
```

## Example: Customize

<!-- Example -->

Obtain Font Awesome from cdn

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
```

Define our custom icons, have volume slider expanded and move volume control before fullscreen button.

```css
x-media-controls {
  --x-icon-font-family: "Font Awesome 6 Free";
  --x-icon-font-weight: 900;
  --x-icon-expand: "\f065";
  --x-icon-collapse: "\f066";
  --x-icon-play: "\f04b";
  --x-icon-pause: "\f04c";
  --x-icon-mute: "\f6a9";
  --x-icon-unmute: "\f028";
  --x-volume-slider-expand: 0;
 
  border-radius: 0.5rem
}

x-media-controls::part(volume-control),
x-media-controls::part(play-button) {
  order: -1;
}

x-media-controls:not(:state(--fullscreen))::part(controls-panel) {
  --x-controls-bg: transparent;
  opacity: 1;
  transform: none;
  pointer-events: none;
  mix-blend-mode: overlay;
}

x-media-controls:not(:state(--fullscreen))::part(overlay-playbutton),
x-media-controls:not(:state(--fullscreen))::part(timeline),
x-media-controls:not(:state(--fullscreen))::part(current-time),
x-media-controls:not(:state(--fullscreen))::part(duration),
x-media-controls:not(:state(--fullscreen))::part(play-button) {
  display: none;
}
```

Provide the actual markup

```html
<x-ambience>
  <x-media-controls id="media-controls" controlslist="notime noplay">
    <video
      style="width: 100%; height: auto;"
      src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      poster="https://picsum.photos/id/211/800/450"
      loop
      onloadedmetadata="//this.muted = true // Firefox won't autplay when initially muted "
      muted
      autoplay
    ></video>
  </x-media-controls>
</x-ambience>
```

Show all controls in fullscreen

```js
const mc = document.querySelector('#media-controls');

mc.addEventListener('fullscreenchange', (e) => {
  const isFullscreen = !!document.fullscreenElement;

  if (!isFullscreen) {
    mc.setAttribute('controlslist', 'notime noplay');
  } else {
    mc.removeAttribute('controlslist');
  }
})
```