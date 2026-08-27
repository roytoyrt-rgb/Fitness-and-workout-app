// Expo's static web export prerenders routes in plain Node, which lacks
// browser-only globals like requestAnimationFrame. react-native-reanimated
// (pulled in transitively via expo-router -> @expo/ui) schedules a worklet
// flush through requestAnimationFrame as a side effect of just being
// imported, which crashes the Node-side export step. The scheduled callback
// has no real animation surface to run against during static export anyway,
// so a minimal stand-in is enough to let the build proceed.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
