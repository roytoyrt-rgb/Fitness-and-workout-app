const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend ships a WebAssembly binary that Metro needs to
// treat as a bundlable asset, not source code.
config.resolver.assetExts.push('wasm');

// That same web backend uses SharedArrayBuffer, which browsers only expose
// on "cross-origin isolated" pages. Add the required response headers to the
// dev server so `npx expo start --web` works locally; any production web
// host will need to set these same two headers (see README).
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
