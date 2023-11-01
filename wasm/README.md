# Mercury layer WASM library

A `wasm-bindgen` library of functions for the mercury layer clients.

This project works only with clang 14.
Building it with a higher version will fail.

To build with `wasm-pack`:

```
# For web
wasm-pack build --release --target web
# Or for nodejs
wasm-pack build --release --target nodejs
```

To run demo: 

```
npm install -g live-server
live-server
```
