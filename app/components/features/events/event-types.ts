export enum GlobalEventType {
  WindowZenModeShortcutTrigger = "WindowZenModeShortcutTrigger",
  NoteManagementCreateNewNoteTrigger = "NoteManagementCreateNewNoteTrigger",
  NoteManagementSaveCurrentNoteTrigger = "NoteManagementSaveCurrentNoteTrigger",
  EditorToggleEditModeTrigger = "EditorToggleEditModeTrigger",
  EditorMakeRowIntoCheckboxTrigger = "EditorMakeRowIntoCheckboxTrigger",
  EditorDebugConsoleTrigger = "EditorDebugConsoleTrigger"
}

export type GlobalEventListener = {
  eventType: GlobalEventType;
  callback: () => void;
};

export type EventContextState = {
  registerEventListener?: (
    eventType: GlobalEventType,
    callback: () => void
  ) => void;
  unregisterEventListener?: (reference: () => void) => void;
  queueEvent?: (eventType: GlobalEventType) => void;
};