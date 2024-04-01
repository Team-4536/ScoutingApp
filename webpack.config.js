const path = require('path');

module.exports = {
  //...
  entry: {
    'qr-scan': './scripts/qr-scan.js'
  },
  mode: 'production',
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.join(process.cwd(), 'bundles'),
    filename: '[name].bundle.js',
    module: true,
    library: {
      type: 'module'
    }
  },
  performance: {
    maxEntrypointSize: 1024000,
    maxAssetSize: 1024000
  }
};

/*
core.wasm
core.worker.js
cvr.wasm
cvr.worker.js
dbr.wasm
dip.wasm
license.wasm
std.js
std.wasm
*/

