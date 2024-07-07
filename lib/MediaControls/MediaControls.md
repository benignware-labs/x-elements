<!--
  dest: components/MediaControls.html
-->
# MediaControls

Consistent media controls across browsers


## Example

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
 
  border-radius: 0.5rem
}

/*
x-media-controls {
 --x-volume-slider-expand: 0;
}

x-media-controls::part(volume-control),
x-media-controls::part(play-button) {
  order: -1;
}
*/
```

Provide the actual markup

```html
<x-ambience>
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
</x-ambience>
```
