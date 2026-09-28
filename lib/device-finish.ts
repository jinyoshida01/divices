import {DEVICES,defaultSettings,type SavedScene,type Settings,type ViewPreferences} from './studio-config';

export type DeviceFinish=Pick<Settings,'deviceColor'|'finish'>;

// Never resolve a device's default from the currently displayed device.
export function deviceFinish(id:string,preferences:ViewPreferences,scenes:SavedScene[]):DeviceFinish {
 const source=preferences.deviceFinishes?.[id]
  ??scenes.find(scene=>scene.snapshot.device===id)?.snapshot.settings
  ??defaultSettings();
 return {deviceColor:source.deviceColor,finish:source.finish};
}

export function settingsForDevice(id:string,settings:Settings,preferences:ViewPreferences,scenes:SavedScene[]):Settings {
 return {...settings,...deviceFinish(id,preferences,scenes)};
}

export function colourForAllDevices(deviceColor:string,preferences:ViewPreferences,scenes:SavedScene[]) {
 const deviceFinishes={...preferences.deviceFinishes};
 for(const device of DEVICES)deviceFinishes[device.id]={...deviceFinish(device.id,preferences,scenes),deviceColor};
 return {deviceFinishes,scenes:scenes.map(scene=>({...scene,snapshot:{...scene.snapshot,settings:{...scene.snapshot.settings,deviceColor}}}))};
}
