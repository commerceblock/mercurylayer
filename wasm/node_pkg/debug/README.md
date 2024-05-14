# Mercury layer WASM library

A `wasm-bindgen` library of functions for the mercury layer clients.

This project works only with clang 14.
Building it with a higher version will fail.

To build with `wasm-pack`:

```bash
# For web
$ wasm-pack build --release --target web --out-dir web_pkg/release/
$ wasm-pack build --debug --target web --out-dir web_pkg/debug/
# Or for nodejs
$ wasm-pack build --release --target nodejs --out-dir node_pkg/release/
$ wasm-pack build --debug --target nodejs --out-dir node_pkg/debug/
```

The file `build_pkgs.sh` does this.

```bash
$ ./build_pkgs.sh
```