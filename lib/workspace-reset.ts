import {essentialsKit} from './essentials-kit';
import {defaultPreferences} from './scene-library';
import type {SceneLibrary} from './scene-backup';

export function freshWorkspace():SceneLibrary {
 const kit=essentialsKit('generic-smartphone',{artwork:null,artworkName:'Green screen'});
 const first=kit.scenes[0];
 return {scenes:kit.scenes,folders:[kit.folder],workspace:{
  current:first.snapshot,
  preferences:{...structuredClone(defaultPreferences),activeScene:first.id},
  deviceArtworks:{},
 }};
}
