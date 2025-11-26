"use client";

import type EditorJS from "@editorjs/editorjs";
import type { OutputData } from "@editorjs/editorjs";
import type React from "react";
import { useEffect, useRef } from "react";

interface EditorJSComponentProps {
  data?: OutputData;
  onChange?: (data: OutputData) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
}

export function EditorJSComponent({
  data,
  onChange,
  placeholder = "Descreva os detalhes da tarefa...",
  readOnly = false,
  minHeight = 200,
}: EditorJSComponentProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const initialDataRef = useRef(data);
  const onChangeRef = useRef(onChange);
  const isInitializing = useRef(false);

  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    // Prevent double initialization (React StrictMode)
    if (!holderRef.current || isInitializing.current || editorRef.current)
      return;

    isInitializing.current = true;
    let isMounted = true;

    const initEditor = async () => {
      if (!holderRef.current || !isMounted) return;

      // Clear any existing content in the holder
      holderRef.current.innerHTML = "";

      const EditorJS = (await import("@editorjs/editorjs")).default;
      const Header = (await import("@editorjs/header")).default;
      const List = (await import("@editorjs/list")).default;
      // @ts-expect-error - no types available
      const Checklist = (await import("@editorjs/checklist")).default;
      const Quote = (await import("@editorjs/quote")).default;
      const Code = (await import("@editorjs/code")).default;
      // @ts-expect-error - no types available
      const Marker = (await import("@editorjs/marker")).default;
      const InlineCode = (await import("@editorjs/inline-code")).default;
      const Delimiter = (await import("@editorjs/delimiter")).default;

      if (!isMounted || !holderRef.current) return;

      const editor = new EditorJS({
        holder: holderRef.current,
        data: initialDataRef.current,
        readOnly: readOnly,
        placeholder: placeholder,
        minHeight: minHeight,
        tools: {
          header: {
            // @ts-expect-error - types mismatch
            class: Header,
            config: {
              placeholder: "Digite um título",
              levels: [2, 3, 4],
              defaultLevel: 3,
            },
          },
          list: {
            class: List,
            inlineToolbar: true,
            config: {
              defaultStyle: "unordered",
            },
          },
          checklist: {
            class: Checklist,
            inlineToolbar: true,
          },
          quote: {
            class: Quote,
            inlineToolbar: true,
            config: {
              quotePlaceholder: "Digite uma citação",
              captionPlaceholder: "Autor",
            },
          },
          code: Code,
          marker: Marker,
          inlineCode: InlineCode,
          delimiter: Delimiter,
        },
        onChange: async () => {
          if (onChangeRef.current && editorRef.current) {
            const outputData = await editorRef.current.save();
            onChangeRef.current(outputData);
          }
        },
      });

      await editor.isReady;

      if (isMounted) {
        editorRef.current = editor;
      } else {
        editor.destroy();
      }
    };

    initEditor();

    return () => {
      isMounted = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      isInitializing.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div
      ref={holderRef}
      className={`prose prose-sm dark:prose-invert max-w-none p-4 ${
        readOnly ? "bg-muted/30" : "bg-background min-h-[200px]"
      }`}
    />
  );
}

// Helper to render EditorJS content as read-only HTML
export function EditorJSRenderer({
  data,
}: {
  data?: OutputData | string | null;
}) {
  if (!data) return null;

  // If data is a string (legacy), just render it
  if (typeof data === "string") {
    return (
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {data}
      </p>
    );
  }

  // Type for list items (new EditorJS format)
  type ListItem = {
    content: string;
    items: ListItem[];
    meta: { checked?: boolean; counterType?: string };
  };

  // Render header based on level
  const renderHeader = (level: number, text: string, key: number) => {
    const className = "font-semibold";
    switch (level) {
      case 1:
        return (
          <h1
            key={key}
            className={className}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        );
      case 2:
        return (
          <h2
            key={key}
            className={className}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        );
      case 3:
        return (
          <h3
            key={key}
            className={className}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        );
      case 4:
        return (
          <h4
            key={key}
            className={className}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        );
      case 5:
        return (
          <h5
            key={key}
            className={className}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        );
      case 6:
        return (
          <h6
            key={key}
            className={className}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        );
      default:
        return (
          <h3
            key={key}
            className={className}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        );
    }
  };

  // Render list items recursively (supports nested lists)
  const renderListItems = (
    items: ListItem[],
    style: "ordered" | "unordered" | "checklist"
  ): React.ReactNode => {
    if (style === "checklist") {
      return items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={item.meta?.checked === true}
            readOnly
            className="h-4 w-4 mt-0.5 rounded border border-input accent-primary cursor-default shrink-0"
          />
          <div className="flex-1">
            <span
              className={
                item.meta?.checked ? "line-through text-muted-foreground" : ""
              }
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
            {item.items && item.items.length > 0 && (
              <div className="ml-2 mt-1 space-y-1">
                {renderListItems(item.items, style)}
              </div>
            )}
          </div>
        </div>
      ));
    }

    const ListTag = style === "ordered" ? "ol" : "ul";
    return (
      <ListTag
        className={style === "ordered" ? "list-decimal pl-5" : "list-disc pl-5"}
      >
        {items.map((item, i) => (
          <li key={i}>
            <span dangerouslySetInnerHTML={{ __html: item.content }} />
            {item.items &&
              item.items.length > 0 &&
              renderListItems(item.items, style)}
          </li>
        ))}
      </ListTag>
    );
  };

  // Parse EditorJS blocks
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-3">
      {data.blocks?.map((block, index) => {
        switch (block.type) {
          case "header":
            return renderHeader(block.data.level, block.data.text, index);

          case "paragraph":
            return (
              <p
                key={index}
                dangerouslySetInnerHTML={{ __html: block.data.text }}
              />
            );

          case "list": {
            const style = block.data.style as
              | "ordered"
              | "unordered"
              | "checklist";
            const items = block.data.items as ListItem[];

            if (style === "checklist") {
              return (
                <div key={index} className="space-y-2 not-prose">
                  {renderListItems(items, style)}
                </div>
              );
            }

            return <div key={index}>{renderListItems(items, style)}</div>;
          }

          case "checklist": {
            // Legacy checklist format (type: "checklist")
            type LegacyChecklistItem = { text: string; checked: boolean };
            const items = block.data.items as LegacyChecklistItem[];

            return (
              <div key={index} className="space-y-2 not-prose">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      readOnly
                      className="h-4 w-4 rounded border border-input accent-primary cursor-default"
                    />
                    <span
                      className={
                        item.checked ? "line-through text-muted-foreground" : ""
                      }
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                  </div>
                ))}
              </div>
            );
          }

          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-4 border-primary/30 pl-4 italic"
              >
                <p dangerouslySetInnerHTML={{ __html: block.data.text }} />
                {block.data.caption && (
                  <footer className="text-sm text-muted-foreground mt-1">
                    — {block.data.caption}
                  </footer>
                )}
              </blockquote>
            );

          case "code":
            return (
              <pre
                key={index}
                className="bg-muted p-4 rounded-lg overflow-x-auto text-sm"
              >
                <code>{block.data.code}</code>
              </pre>
            );

          case "delimiter":
            return (
              <div
                key={index}
                className="flex items-center justify-center py-2"
              >
                <span className="text-muted-foreground text-2xl tracking-widest">
                  ***
                </span>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// Parse description - handles both string and EditorJS format
export function parseDescription(
  description?: string | null
): OutputData | undefined {
  if (!description) return undefined;

  try {
    const parsed = JSON.parse(description);
    if (parsed.blocks) {
      return parsed as OutputData;
    }
  } catch {
    // Not JSON, treat as plain text
  }

  // Convert plain text to EditorJS format
  return {
    time: Date.now(),
    blocks: [
      {
        type: "paragraph",
        data: { text: description },
      },
    ],
  };
}

// Stringify EditorJS data for storage
export function stringifyDescription(
  data?: OutputData | null
): string | undefined {
  if (!data || !data.blocks || data.blocks.length === 0) return undefined;
  return JSON.stringify(data);
}

// Get plain text preview from EditorJS data
export function getDescriptionPreview(
  description?: string | null,
  maxLength = 100
): string {
  if (!description) return "";

  try {
    const parsed = JSON.parse(description);
    if (parsed.blocks) {
      const text = parsed.blocks
        .map(
          (block: {
            type: string;
            data: {
              text?: string;
              items?: (
                | string
                | {
                    text?: string;
                    content?: string;
                    checked?: boolean;
                    meta?: { checked?: boolean };
                  }
              )[];
            };
          }) => {
            if (block.data.text) return block.data.text;
            if (block.data.items) {
              return block.data.items
                .map((item) => {
                  if (typeof item === "string") return item;
                  // Handle both formats: { text } and { content }
                  return item.content || item.text || "";
                })
                .join(" ");
            }
            return "";
          }
        )
        .join(" ")
        .replace(/<[^>]*>/g, ""); // Remove HTML tags

      return text.length > maxLength
        ? text.substring(0, maxLength) + "..."
        : text;
    }
  } catch {
    // Plain text
  }

  return description.length > maxLength
    ? description.substring(0, maxLength) + "..."
    : description;
}
