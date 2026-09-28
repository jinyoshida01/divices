# Divices

Create 3D device mockups in your browser. Upload screen artwork, adjust the camera and lighting, and export transparent PNGs.

[Open Divices](https://jinyoshida01.github.io/divices/) · Made by [Jin Yoshida](https://jinyoshida.me)

## Features

- Six devices: Generic Smartphone, iPhone 14 Pro, iPhone 16 Pro Max, iPad Pro, Samsung Galaxy S24 and Galaxy Tab A7 Lite.
- Camera presets, perspective and orthographic views, and adjustable depth of field.
- Movable lights, HDRI environments and an editor for adding light and shadow shapes.
- Device colours, screen reflection controls and outline glow.
- Saved scenes, folders and Essentials Kits, with artwork assignments per scene or device.
- Transparent PNG exports up to 4096 × 4096, including batch export and custom filenames.

Scenes and artwork are saved locally in your browser. Use **Save Backup** and **Import Backup** to move a workspace between browsers or between the live site and localhost.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Built with React, Three.js, TypeScript and Vite.

## Build and publish

```sh
npm run build
```

Commit the generated `docs/` folder with the source changes. GitHub Pages serves `docs/` from `main`.

## Credits

Device models are adapted from supplied Blender assets. They are presentation models, not manufacturer CAD files. Apple details were checked against the [iPhone 16 Pro](https://www.apple.com/uk/newsroom/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/) and [2020 iPad Pro](https://www.apple.com/newsroom/2020/03/apple-unveils-new-ipad-pro-with-breakthrough-lidar-scanner-and-brings-trackpad-support-to-ipados/) references.

HDRIs are from Poly Haven, by Greg Zaal and Sergej Majboroda, under CC0. See [environment credits and licences](public/environments/LICENSE.txt). The bundled shadcn stylesheet licence is in [vendor](vendor/shadcn-tailwind-4.13.0.LICENSE.md).
