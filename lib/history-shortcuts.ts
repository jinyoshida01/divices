type ShortcutEvent=Pick<KeyboardEvent,'key'|'ctrlKey'|'metaKey'|'shiftKey'|'altKey'|'isComposing'|'defaultPrevented'|'repeat'>;

export function historyShortcut(event:ShortcutEvent):'undo'|'redo'|null {
 if(event.defaultPrevented||event.isComposing||event.repeat||event.altKey||!(event.ctrlKey||event.metaKey))return null;
 const key=event.key.toLowerCase();
 if(key==='z')return event.shiftKey?'redo':'undo';
 return event.ctrlKey&&key==='y'?'redo':null;
}
