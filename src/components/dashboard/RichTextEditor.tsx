"use client";

import { useEffect, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Bold,
  Italic,
  Underline,
  Link,
  Paragraph,
  Heading,
  List,
  BlockQuote,
  Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
}: RichTextEditorProps) {
  const isFirstRender = useRef(true);

  return (
    <div className="ck-editor-wrapper">
      <CKEditor
        editor={ClassicEditor}
        config={{
          licenseKey: "GPL",
          plugins: [
            Essentials,
            Bold,
            Italic,
            Underline,
            Link,
            Paragraph,
            Heading,
            List,
            BlockQuote,
            Undo,
          ],
          toolbar: [
            "heading",
            "|",
            "bold",
            "italic",
            "underline",
            "link",
            "|",
            "bulletedList",
            "numberedList",
            "blockQuote",
            "|",
            "undo",
            "redo",
          ],
          initialData: value,
        }}
        disabled={disabled}
        onChange={(_, editor) => {
          if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
          }
          onChange(editor.getData());
        }}
        onReady={(editor) => {
          // Sync initial value on ready
          if (value && editor.getData() !== value) {
            editor.setData(value);
          }
          isFirstRender.current = false;
        }}
      />
    </div>
  );
}
