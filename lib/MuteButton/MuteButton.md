<!--
  dest: components/MuteButton.html
-->
# MuteButton

Mutes/unmutes a media element

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
<button is="x-mute-button" target="#video">
  <i slot="mute">Mute</i>
  <i slot="unmute">Unmute</i>
</button>
```
