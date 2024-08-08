<!--
  dest: components/MediaControls.html
-->
# MediaControls

Consistent media controls across browsers

## Example: ControlsList

<!-- Example -->

```html
<x-media-controls controlslist="nofullscreen" style="--x-volume-slider-expand: 0; --x-controls-gap: 0.5rem">
  <video
    style="width: 100%; height: auto;"
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    poster="https://picsum.photos/id/211/800/450"
    loop
    onloadedmetadata="//this.muted = true // Firefox won't autplay when initially muted "
    muted
    controls
  ></video>
</x-media-controls>
```
