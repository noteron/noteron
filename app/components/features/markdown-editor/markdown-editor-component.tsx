import React, { useState, useCallback, useRef, useEffect } from "react";
import { useTheme, makeStyles, Theme, createStyles } from "@material-ui/core";
import VerticalDisplaySection from "../../layout/vertical-display-section";
import useMarkdown from "../../hooks/use-markdown";
import useShortcut from "../../hooks/use-shortcut";
import useEditorTools from "./hooks/use-editor-tools";
import { InsertType, CursorPosition } from "./editor-types";
import useImageAttachments from "./hooks/use-image-attachments";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    textArea: {
      border: "none",
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      height: "100%",
      width: "100%",
      fontFamily: "monospace",
      fontSize: 20,
      resize: "none",
      "&:focus": {
        outline: "none"
      }
    }
  })
);

type Props = {
  rawMarkdown: string;
  onChange: (value: string) => void;
};

const MarkdownEditorComponent = ({
  rawMarkdown,
  onChange
}: Props): JSX.Element => {
  const theme = useTheme();
  const classes = useStyles(theme);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [needToSetFocus, setNeedToSetFocus] = useState<boolean>(false);
  const [lastCursorPosition, setLastCursorPosition] = useState<
    CursorPosition
  >();
  const { saveImageFromClipboard } = useImageAttachments();
  const {
    insertOrReplaceAtPosition,
    writeDebugInfoToConsole
  } = useEditorTools();

  const renderedMarkdown = useMarkdown(rawMarkdown);

  useEffect(() => {
    const ref = textArea.current;
    if (editMode && needToSetFocus && ref) {
      if (ref.ATTRIBUTE_NODE) ref.focus();
      const fallbackCursorPosition = rawMarkdown.length;
      ref.selectionStart = lastCursorPosition?.start ?? fallbackCursorPosition;
      ref.selectionEnd = lastCursorPosition?.end ?? fallbackCursorPosition;
      ref.selectionDirection =
        // eslint-disable-next-line no-nested-ternary
        lastCursorPosition?.isForwardSelection === undefined
          ? "none"
          : lastCursorPosition.isForwardSelection
          ? "forward"
          : "backward";
      setNeedToSetFocus(false);
    }
  }, [
    editMode,
    lastCursorPosition?.end,
    lastCursorPosition?.isForwardSelection,
    lastCursorPosition?.start,
    needToSetFocus,
    rawMarkdown.length
  ]);

  const updateLastCursorPosition = useCallback(() => {
    const ref = textArea.current;
    if (ref)
      setLastCursorPosition({
        start: ref.selectionStart,
        end: ref.selectionEnd,
        isForwardSelection: ref.selectionDirection === "forward",
        isSelection: ref.selectionDirection === "none"
      });
  }, []);

  const handleOnMarkdownUpdated = useCallback(
    (newMarkdown: string) => {
      updateLastCursorPosition();
      onChange(newMarkdown);
    },
    [onChange, updateLastCursorPosition]
  );

  const handleOnToggleEditModeShortcut = useCallback(() => {
    setEditMode((prev: boolean) => !prev);
    setNeedToSetFocus(true);
  }, []);

  const handleOnInsertCheckboxShortcut = useCallback(() => {
    insertOrReplaceAtPosition(
      " - [ ] ",
      InsertType.RowStart,
      textArea,
      rawMarkdown,
      handleOnMarkdownUpdated
    );
  }, [handleOnMarkdownUpdated, insertOrReplaceAtPosition, rawMarkdown]);

  const handleOnDebugShortcut = useCallback(
    () => writeDebugInfoToConsole(textArea, rawMarkdown),
    [rawMarkdown, writeDebugInfoToConsole]
  );

  useShortcut(
    {
      altKey: false,
      ctrlKey: true,
      key: "e"
    },
    handleOnToggleEditModeShortcut
  );

  useShortcut(
    {
      altKey: true,
      ctrlKey: false,
      key: "d"
    },
    handleOnInsertCheckboxShortcut
  );

  useShortcut(
    {
      altKey: true,
      ctrlKey: false,
      key: "s"
    },
    handleOnDebugShortcut
  );

  const handleOnTextAreaChanged = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>): void =>
      handleOnMarkdownUpdated(event.target.value),
    [handleOnMarkdownUpdated]
  );

  const handleOnPaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>): Promise<void> => {
      const markdownLinkToImage = await saveImageFromClipboard(event);
      insertOrReplaceAtPosition(
        markdownLinkToImage,
        InsertType.ReplaceSelection,
        textArea,
        rawMarkdown,
        handleOnMarkdownUpdated
      );
    },
    [
      handleOnMarkdownUpdated,
      insertOrReplaceAtPosition,
      rawMarkdown,
      saveImageFromClipboard
    ]
  );

  return (
    <VerticalDisplaySection>
      {editMode ? (
        <textarea
          ref={textArea}
          draggable={false}
          className={classes.textArea}
          onChange={handleOnTextAreaChanged}
          value={rawMarkdown}
          onPaste={handleOnPaste}
          onKeyDown={updateLastCursorPosition}
        />
      ) : (
        renderedMarkdown
      )}
    </VerticalDisplaySection>
  );
};

export default MarkdownEditorComponent;