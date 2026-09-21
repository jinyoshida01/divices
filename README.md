# Divices

A Three.js workspace for premium device screen mockups. Created by [Jin Yoshida](https://jinyoshida.me) · [GitHub](https://github.com/jinyoshida01).

## Create a mockup

Choose Generic Smartphone, iPhone 14 Pro, iPhone 16 Pro Max, iPad Pro, Samsung Galaxy S24 or Galaxy Tab A7 Lite. Upload PNG, JPG or WebP artwork; native screen dimensions and manufacturer specification links appear beside the upload area. Artwork uses a centred crop without stretching, with a live crop preview. Screen pixels bypass scene exposure and tone mapping; Product is the default tone mapping for the device. Empty screens use plain green. Screen reflections can be disabled independently.

Orbit and zoom directly in the viewport. Hero, front, bottom, side and orthographic isometric views include lighting adjustments. Eight full-circle angles each have their own light rig. The light viewport background changes only the viewing surface, leaving illumination and exports unchanged.

The split lighting view keeps the render beside an overview of the light rig. Click a light panel to select it and drag its axes, or adjust its X/Y/Z sliders, colour, intensity and size. Environment controls include procedural softboxes, strips, daylight, a photographic HDRI, custom HDR/EXR files and No HDRI, with rotation, intensity and backdrop blur.

Device finishes use satin, matte or polished surfaces. iPhone backs use textured glass, with glossy glass camera islands and metallic lens rings. Tablet shells and Samsung creative finishes use satin metal shading. A smooth coloured outline glow is available under Look and is included in saved scenes and PNG exports.

## Scenes and Essentials Kits

Save the complete device, camera, lighting, material, artwork, custom HDRI, outline glow and export settings as a named scene. Organise scenes into named folders and nested folders. Select individual scenes or entire folders for bulk ZIP export. Folder checkboxes include nested folders and show a partial state when only some scenes are selected. Scene cards show their assigned artwork filename and have an artwork button for that scene. Add screen artworks is available above the scene list.

Uploading or dropping screen artwork opens an assignment dialog, defaulting to the current scene only. Choose individual scenes in their folder hierarchy, a folder including its subfolders, scenes using selected devices, or all saved scenes. The dialog previews the image and the number of affected scenes before applying. Artwork saves immediately to the chosen scenes while retaining their cameras, lighting and other settings. The Devices tab has Default artworks: use the add/replace and remove icons on each device, or Set device artwork overrides for multiple devices. Defaults override previews and exports for all scenes using those devices, including new scenes and Essentials Kits. Individual scene artworks stay intact underneath; removing a default reveals them again. Defaults persist locally and are included in backups. Clearing to green uses the same scope controls.

Each device has an Essentials Kit with 12 individually lit compositions: 0°, 45°, 315° and nine dynamic views, including a centred bottom-up close-up. Export a kit directly as PNGs in a ZIP, or load its scenes into a named folder for editing. New kits keep green screens as their own artwork; an explicit device default overrides their displayed artwork.

The current workspace and scene library save automatically in this browser. Existing saved records are retained through the storage upgrade. Save backup produces a portable JSON file containing all scenes, folders, current settings, artwork and HDRI data. Import backup validates the file, previews its scene/folder counts, and asks before replacing the current library. Browser storage is local to the browser and website address; keep a backup before clearing it or switching browsers.

## Export

Transparent PNG at 4096 pixels square is the default, with 1200 and 2400 options available. Previously saved scenes retain their chosen settings. Export framing fits the complete device, including camera protrusions and outline glow, without changing the working camera. Editor handles and grids are excluded. The export panel can be minimised. Select more than one scene to reveal Export selected in the right-hand Export panel. Bulk export restores the original workspace afterward and provides a button to download the generated ZIP again.

## Models and rendering

The supplied Blender assets provide dimensions and retained details. Repaired enclosures use smooth bevels and distinct front, back, frame and optical materials. The iPad is the 2020 iPad Pro represented by the supplied asset. Apple device proportions, camera layouts and glass treatments follow official product references, including [iPhone 16 Pro](https://www.apple.com/uk/newsroom/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/) and [iPad Pro 2020](https://www.apple.com/newsroom/2020/03/apple-unveils-new-ipad-pro-with-breakthrough-lidar-scanner-and-brings-trackpad-support-to-ipados/).

These are presentation models, not manufacturer CAD files. Colours are creative finishes; the metallic Samsung rear treatment is an artistic option. Rendering uses real-time physical materials, area lights and prefiltered environments rather than offline path tracing.

## Environment attribution

Studio Small 03 by Greg Zaal, Poly Haven, CC0. See `public/environments/LICENSE.txt`.

## Scene and HDRI editing updates

Select scene checkboxes to export or bulk delete. Deletion shows the selected count and supports Undo and Redo through the header during the current session. Hero and Slight right use the same screen-friendly lighting. Light manipulation axes maintain their world size and shrink naturally when the lighting view is zoomed out.

Under Look, the HDRI shape editor is always expanded. Use it to add white or black circles and squares. Drag shapes on the environment preview (or use arrow keys and position sliders), then adjust their size, brightness and edge softness. White shapes act as light panels; black shapes mask the underlying environment. Edits are composed in linear HDR before reflection prefiltering and work with built-in or uploaded HDR/EXR environments. The source file remains intact. Shape layers are included in saved scenes, autosave, backups and exports.

## Export names and folder management

Single-image export naming defaults to the scene number alone, such as `01.png`. Multi-scene exports prefix each image with its own folder name, using hyphens for spaces: `Samsung-Galaxy-24_01.png`. Unfiled scenes have no folder prefix. Direct Essentials Kit exports use the kit folder name. ZIPs contain a device folder such as `Generic_Smartphone_EK`, and use the same name for the archive. The Export naming panel also offers scene names, device plus number, a custom prefix and a custom ZIP/folder name. Duplicate file names receive a suffix so no image is overwritten. Naming preferences are retained and included in workspace backups.

Folders can be deleted along with their nested folders. By default all scenes inside are deleted too; uncheck the contents option to keep them in Unfiled. The last deletion can be undone until the next deletion or reload.

HDRI shape edits refresh throughout dragging and automatically update the selected saved scene. Environment selection, rotation, intensity, backdrop and custom HDRI data are retained per scene as well. Switching scenes waits for pending HDRI changes to save. Other scene settings still use Save scene to update the named record.

## Scene previews and panel layout

Saved scenes show small rendered previews with their device, camera, artwork and lighting. Visible previews render in a separate background renderer and are cached for the session; changes to saved visual settings refresh the corresponding preview. The working viewport is not moved to generate thumbnails.

Switch between Previews and Compact above the scene list. Compact uses short file-style rows, expandable folders, and an actions menu for moving scenes or managing folders. Drag the left panel divider to widen it from its original responsive minimum to a maximum of 480 px (lower on narrow windows). The divider also supports arrow keys, Home/End, and double-click to reset. Phone layouts keep full-width stacked panels. Panel width and display mode are retained in autosave and backups.

## Saving scene changes

New scenes and Essentials Kits keep green screens as their own artwork, even when the current view has uploaded artwork. Explicit device defaults override the displayed screen until removed. Updating an existing scene retains its artwork. Switching to another scene with unsaved changes opens Save and continue, Discard changes and Cancel. Switching devices does not show a save warning. Saving preserves the complete scene; discarding leaves its last saved settings intact. HDRI and artwork assignments that were already saved immediately remain saved.

### Scene organisation and history

Drag scene rows above or below other scene rows to reorder them. Drag folder headings to reorder folders, or into the centre of another folder heading to nest them. Drop at the top-level target to unnest a folder. Cyclic nesting is prevented. The Reorder menu offers natural name/number order, reverse name order, newest scenes first, and device then name, while retaining the folder hierarchy. Manual order is saved, included in backups, and retained when editing scenes. Drag a scene onto a folder heading to move it. Dragging a selected scene moves the entire selection; dragging an unselected scene moves only that scene. Drop on Unfiled to remove folder membership. Collapsed folders accept drops and open afterward. Folder menus and the folder selector provide keyboard-accessible alternatives. Add Folder moves the selected scenes into the newly created folder in the same operation; renaming a folder does not move scenes. Save Scene is available in both the header and the left Scenes panel.

The header Undo/Redo controls retain up to 50 actions during the current session, including scene/folder changes, artwork and device overrides, imports, camera, lighting, HDRI and export settings. Continuous slider adjustments are grouped. Cmd/Ctrl-Z undoes; Cmd/Ctrl-Shift-Z (or Ctrl-Y) redoes. Text fields retain their own editing shortcuts. New changes clear the redo history. Reloading clears history, while the current saved workspace and library remain persisted.


## Run locally

Use Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

## Publish updates to GitHub Pages

```sh
npm run build
```

Commit the source changes and the generated `docs/` folder, then push to `main`. GitHub Pages serves `main` → `/docs`. The relative asset paths support the `/divices/` project address as well as a custom domain. No server, account or API key is needed.

## Local data

Scenes, artwork and imported HDRIs stay in the visitor's browser. Moving between localhost and the published site uses separate browser storage; use **Save backup** and **Import backup** to transfer a workspace. New visitors start with the Generic Smartphone Essentials Kit. The header **?** guide explains the workspace and lighting controls.
