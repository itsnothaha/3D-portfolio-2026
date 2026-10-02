# model-viewer

Local distribution of `@google/model-viewer` 4.0.0, Apache-2.0 (see LICENSE).
Source: https://github.com/google/model-viewer
Distribution: https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js

Used only on contacts.html. No CDN request is needed at runtime. The supplied
GLB is self-contained and uses no Draco or KTX decoder. Built-in legacy lighting
requires no external environment map. The initial view matches the artwork;
native camera controls support rotation and bounded zoom, with panning disabled.
There is no auto-rotation or custom animation loop.
