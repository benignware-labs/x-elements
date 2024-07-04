<!--
  dest: components/FullscreenButton.html
-->
# FullscreenButton

Toggles fullscreen on videos and other targets

## Example: Fullscreen Document

<!-- Example -->
```html
<button is="x-fullscreen-button">
  <i slot="expand">Expand</i>
  <i slot="collapse">Collapse</i>
</button>
```

## Example: Target Element

<!-- Example -->
```html
<div id="fullscreenTarget">
  <video
    id="video"
    style="aspect-ratio: 16/9; width: 100%; height: auto; "
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    autoplay
    loop
    muted
    playsinline
  ></video>
  <button is="x-fullscreen-button" target="#fullscreenTarget">
    <i slot="expand">Expand</i>
    <i slot="collapse">Collapse</i>
  </button>
</div>
```