<!--
  dest: components/PlayButton.html
-->
# PlayButton

Toggles play/pause on media element

## Example

<!-- Example -->
```html
<video
  id="video"
  style="aspect-ratio: 16/9; width: 100%; height: auto; "
  src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  autoplay
  loop
  muted
  playsinline
></video>
<button is="x-play-button" target="#video">
  <i slot="play">Play</i>
  <i slot="pause">Pause</i>
</button>
```
