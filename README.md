# itisModelViewer

## Embed

To embed the viewer in you website, just add an <iframe> and set `src` attribute to the `/viewer/` folder, such as `https://jiajiajiang.github.io/itisModelViewer/viewer/`. (You'd better not embed it from `GitHub Pages` here cause options may be changed in the feature, please pull the viewer to your server.)

This viewer parses options from URL hash, the format is `name1=value1&name1=value1`. If no value followed, the name will become a switch.

All names and values will be  URI decoded, so if there are some special signs in the name or value, do URI encode first.

### Options

* url : The URL of the model file, supports `gltf`,`glb`,`fbx` files. If not set, a cube will keep rotating and  you can change the default view.
* alpha : (Switch) Make the background transparent.
* antialiasOff : (Switch) Turn off antialias.
* bgColor : (Switch) Set a background color. If `alpha` exists, this option will not take effect
* campos : Position of the default camera, data is in a special base36 format. Will be updated if you do some change of the view.
* defocus : (Switch) Turn on "Depth of field" effect. (Not so good)
* gridHelper : (Switch) Show a grid for debug.
* highQuality : (Switch) Keep high quality rendering. Without this option, only the last frame of animations will be high quality.
* meshDebug : (Switch) Show mesh of the model for debug.
* noAnimation : (Switch) Turn off animations of the model file.
* precision : WebGL precision option, the value can be `lowp`,`mediump` or `highp`.
* shadow : (Switch) Show shadow. If there are multi-lights, strange texture error may happen.
* wireframe : (Switch) Render all model as wireframe.

### Example

https://jiajiajiang.github.io/itisModelViewer/viewer/#url=%2F%2Fio.luojia.me%2Fmodel%2F2021%2F0120%2FIRCameraShell.glb&gridHelper&meshDebug&campos=-1.2eao01gol6y%2C1.15w7zgww1yy%2C1.ygqpqruzf9%2C-0.cuylbsfvj1%2C-0.cr4do7btrm%2C-0.9fk4eco1w7s

This URL turns on `gridHelper` and `meshDebug`, and set camera to a position.

### API

Post an issue if you need it.