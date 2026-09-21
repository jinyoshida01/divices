/** Resolve bundled assets under either a domain root or a project subdirectory. */
export function publicAsset(path:string){return new URL(path.replace(/^\/+/,''),document.baseURI).href}
