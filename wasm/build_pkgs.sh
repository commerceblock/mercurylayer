rm  node_pkg/debug/*
rm  node_pkg/release/*
rm  web_pkg/debug/*
rm  web_pkg/release/*

wasm-pack build --release --target web --out-dir web_pkg/release/
wasm-pack build --debug --target web --out-dir web_pkg/debug/
wasm-pack build --release --target nodejs --out-dir node_pkg/release/
wasm-pack build --debug --target nodejs --out-dir node_pkg/debug/