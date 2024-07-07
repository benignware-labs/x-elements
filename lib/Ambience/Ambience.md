<!--
  dest: components/Ambience.html
-->
# Ambience


<!-- Example -->

The Ambience Component creates an atmospheric backdrop on images and video.

## Example: Image

<!-- Example -->
```html
<x-ambience>
  <img
    src="https://picsum.photos/id/134/800/450"
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
    poster="https://picsum.photos/id/151/800/450"
    loop
    muted
    playsinline
    controls
  ></video>
  </x-ambience>
```

## Example: Using "for" attribute

Similar to the "for" attribute of the html label element, you may target an element in the outer scope by its id. Note that the Ambience backdrop is absolutely positioned, so without further ado, place it right before the target element.

<!-- Example -->

```html
<x-ambience for="imgtest"/>
<img
  id="imgtest"
  src="https://picsum.photos/id/134/800/450"
  style="aspect-ratio: 16/9; width: 100%; height: auto; "
/>
```