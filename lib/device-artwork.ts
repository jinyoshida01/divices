import type {DeviceArtworks,SceneSnapshot} from './studio-config';

// Resolve only for display/export; individual scene artwork stays untouched.
export function withDeviceArtwork(snapshot:SceneSnapshot,defaults:DeviceArtworks):SceneSnapshot {
 const artwork=defaults[snapshot.device];
 return artwork?{...snapshot,...artwork}:snapshot;
}
