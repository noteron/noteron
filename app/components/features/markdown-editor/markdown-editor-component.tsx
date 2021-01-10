import React, {
  useState,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  createRef
} from "react";
import MonacoEditor, {
  ChangeHandler,
  EditorDidMount
} from "react-monaco-editor";
import * as monaco from "monaco-editor";
import { makeStyles, createStyles, Tooltip } from "@material-ui/core";
import { Edit } from "@material-ui/icons";
import { ToggleButton } from "@material-ui/lab";
import VerticalDisplaySection from "../../layout/vertical-display-section";
import useEditorTools from "./hooks/use-editor-tools";
import useImageAttachments from "./hooks/use-image-attachments";
import NoteManagementContext from "../note-management/contexts/note-management-context";
import { DEFAULT_NOTE } from "../note-management/note-management-constants";
import { GlobalEventType } from "../events/event-types";
import { useEventListener } from "../events";
import useLocalStorageState from "../local-storage-state/use-local-storage-state";
import LocalStorageKeys from "../local-storage-state/local-storage-keys";
import useMarkdown from "../../hooks/use-markdown";
import useEditorFontSize from "./hooks/use-editor-font-size";
import TagButton from "./tag-button";

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      minHeight: "100vh",
      height: "100%"
    }
  })
);

const MarkdownEditorComponent = (): JSX.Element => {
  const classes = useStyles();
  const { currentNote, updateCurrentNote, updateTags } = useContext(
    NoteManagementContext
  );
  const [editMode, setEditMode] = useLocalStorageState<boolean>(
    LocalStorageKeys.EditorMode,
    false
  );
  const [queueFocus, setQueueFocus] = useState<boolean>(false);
  const [queueInsertCheckbox, setQueueInsertCheckbox] = useState<boolean>(
    false
  );
  const [cursorPosition, setCursorPosition] = useState<monaco.Position>();
  const { saveImageFromClipboard } = useImageAttachments();
  const { toggleCheckboxOnCurrentLine } = useEditorTools();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
  const monacoContainerRef = createRef<HTMLDivElement>();

  const rawMarkdown = useMemo<string>(() => currentNote?.markdown ?? "", [
    currentNote?.markdown
  ]);
  const renderedMarkdown = useMarkdown(currentNote?.markdown ?? "");
  const editorFontSize = useEditorFontSize();

  useEffect(() => {
    if (!queueFocus || !editMode || !editor) return;
    if (!cursorPosition) {
      const layoutInfo = editor.getLayoutInfo();
      editor.setPosition({
        column: layoutInfo.contentWidth,
        lineNumber: layoutInfo.lineNumbersWidth
      });
    } else {
      editor.setPosition(cursorPosition);
    }
    editor.focus();
    setQueueFocus(false);
  }, [editMode, editor, queueFocus, cursorPosition, rawMarkdown.length]);

  useEffect(() => {
    if (!editMode) {
      setEditor(undefined);
    }
  }, [editMode]);

  const handleOnWindowResize = useCallback(() => {
    if (editor) {
      editor.layout();
    }
  }, [editor]);

  useEffect(() => {
    window.addEventListener("resize", handleOnWindowResize);
    return () => {
      window.removeEventListener("resize", handleOnWindowResize);
    };
  }, [handleOnWindowResize]);

  const handleOnMarkdownUpdated = useCallback(
    (newMarkdown: string) => {
      if (!updateCurrentNote) return;
      updateCurrentNote({
        markdown: newMarkdown,
        fileDescription: {
          created: (currentNote ?? DEFAULT_NOTE).fileDescription.created,
          modified: Date.now(),
          fileExists: currentNote?.fileDescription.fileExists ?? true,
          fileNameWithoutExtension: (currentNote ?? DEFAULT_NOTE)
            .fileDescription.fileNameWithoutExtension,
          tags: (currentNote ?? DEFAULT_NOTE).fileDescription.tags,
          title: (currentNote ?? DEFAULT_NOTE).fileDescription.title
        }
      });
    },
    [currentNote, updateCurrentNote]
  );

  const handleOnTagsUpdated = useCallback(
    (newTags: string[] | undefined) => {
      console.log("handleOnTagsUpdated. Take newTags and save on file");
      console.log(newTags);
      if (!updateTags) return;
      updateTags(newTags ?? []);
    },
    [updateTags]
  );

  const handleToggleEditMode = useCallback(() => {
    setEditMode(editMode === undefined ? false : !editMode);
    setQueueFocus(true);
  }, [editMode, setEditMode]);

  useEventListener(
    GlobalEventType.EditorToggleEditModeTrigger,
    handleToggleEditMode
  );

  useEffect(() => {
    if (!queueInsertCheckbox || !editor) return;
    toggleCheckboxOnCurrentLine(editor);
    setQueueInsertCheckbox(false);
  }, [editor, queueInsertCheckbox, toggleCheckboxOnCurrentLine]);
  const handleMakeRowIntoCheckbox = useCallback(
    () => setQueueInsertCheckbox(true),
    []
  );
  useEventListener(
    GlobalEventType.EditorMakeRowIntoCheckboxTrigger,
    handleMakeRowIntoCheckbox
  );

  const handleOnPaste = useCallback(
    async (event: ClipboardEvent): Promise<void> => {
      if (!editor) return;
      const markdownLinkToImage = await saveImageFromClipboard(event);
      const position = editor.getPosition();
      const selection = editor.getSelection();
      editor.executeEdits(rawMarkdown, [
        {
          range: {
            startLineNumber:
              selection?.startLineNumber ?? position?.lineNumber ?? 1,
            endLineNumber:
              selection?.endLineNumber ?? position?.lineNumber ?? 1,
            startColumn: selection?.startColumn ?? position?.column ?? 1,
            endColumn: selection?.endColumn ?? position?.column ?? 1
          },
          text: markdownLinkToImage,
          forceMoveMarkers: true
        }
      ]);
    },
    [editor, rawMarkdown, saveImageFromClipboard]
  );

  const handleEditorDidMount: EditorDidMount = useCallback(
    (reference: monaco.editor.IStandaloneCodeEditor) => {
      setEditor(reference);
    },
    []
  );

  const handleOnChangeEditor: ChangeHandler = useCallback(
    (value) => {
      handleOnMarkdownUpdated(value);
    },
    [handleOnMarkdownUpdated]
  );

  const applyUpdateCursorPositionHandler = useCallback(() => {
    if (!editor) return;
    editor.onDidChangeCursorPosition(() => {
      const position = editor.getPosition();
      setCursorPosition(position ?? undefined);
    });
  }, [editor]);

  useEffect(applyUpdateCursorPositionHandler, [
    applyUpdateCursorPositionHandler
  ]);

  useEffect(() => {
    const { current } = monacoContainerRef;
    if (!current) return undefined;
    current.addEventListener("paste", handleOnPaste);
    return () => {
      current.removeEventListener("paste", handleOnPaste);
    };
  }, [monacoContainerRef, handleOnPaste]);

  return (
    <>
      <div>
        <Tooltip title="Toggle edit mode" aria-label="toggle edit mode">
          <ToggleButton
            size="small"
            onChange={handleToggleEditMode}
            selected={editMode ?? false}
            value
          >
            <Edit />
          </ToggleButton>
        </Tooltip>
        <TagButton
          tags={currentNote?.fileDescription?.tags}
          fileNameWithoutExtension={
            currentNote?.fileDescription?.fileNameWithoutExtension
          }
          onTagsUpdated={handleOnTagsUpdated}
        />
      </div>
      {editMode ? (
        <div ref={monacoContainerRef} className={classes.container}>
          <MonacoEditor
            theme="vs-dark"
            language="markdown"
            value={rawMarkdown}
            onChange={handleOnChangeEditor}
            editorDidMount={handleEditorDidMount}
            options={{ fontSize: editorFontSize }}
          />
        </div>
      ) : (
        <VerticalDisplaySection>{renderedMarkdown}</VerticalDisplaySection>
      )}
    </>
  );
};

export default MarkdownEditorComponent;
