<!--
  dest: components/Ambience.html
-->
# Ambience

The Ambience Component creates an atmospheric backdrop on images and video.

## Example: Image

<!-- Example -->
```html
<x-ambience>
  <img
    src="https://loremflickr.com/1280/640?lock=1234"
    style="aspect-ratio: 16/9; width: 100%; height: auto; "
  />
</x-ambience>
```

## Example: Video

<!-- Example -->
```html
<x-ambience>
   <video
    id="video"
    style="aspect-ratio: 16/9; width: 100%; height: auto; "
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    autoplay
    loop
    muted
    playsinline
  ></video>
  </x-ambience>
```
