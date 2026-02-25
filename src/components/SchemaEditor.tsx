"use client";

import { useCallback } from "react";
import Editor from "@monaco-editor/react";
import {
  ChevronDown,
  FileCode2,
  Database,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { InputFormat } from "@/types/schema";
import { EXAMPLE_SCHEMAS, type ExampleSchema } from "@/examples";

interface SchemaEditorProps {
  value: string;
  onChange: (value: string) => void;
  format: InputFormat;
  onFormatChange: (format: InputFormat) => void;
}

const FORMAT_CONFIG: Record<
  InputFormat,
  { label: string; icon: React.ReactNode; monacoLang: string }
> = {
  prisma: {
    label: "Prisma",
    icon: <FileCode2 size={14} />,
    monacoLang: "graphql", // Close enough for syntax highlighting
  },
  sql: {
    label: "SQL",
    icon: <Database size={14} />,
    monacoLang: "sql",
  },
  english: {
    label: "English",
    icon: <MessageSquare size={14} />,
    monacoLang: "markdown",
  },
};

export function SchemaEditor({
  value,
  onChange,
  format,
  onFormatChange,
}: SchemaEditorProps) {
  const config = FORMAT_CONFIG[format];

  const loadExample = useCallback(
    (example: ExampleSchema) => {
      onFormatChange(example.format);
      onChange(example.content);
    },
    [onChange, onFormatChange]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        {/* Format picker */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono
                               text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]
                               border border-[var(--border-subtle)] transition-colors">
              {config.icon}
              <span>{config.label}</span>
              <ChevronDown size={12} className="text-[var(--text-muted)]" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[140px] bg-[var(--bg-elevated)] border border-[var(--border-default)]
                         rounded-lg p-1 shadow-xl shadow-black/40 z-50 animate-fade-in"
              sideOffset={4}
            >
              {(Object.keys(FORMAT_CONFIG) as InputFormat[]).map((fmt) => (
                <DropdownMenu.Item
                  key={fmt}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono
                             text-[var(--text-secondary)] cursor-pointer outline-none
                             data-[highlighted]:bg-[var(--accent-subtle)] data-[highlighted]:text-[var(--accent)]"
                  onSelect={() => onFormatChange(fmt)}
                >
                  {FORMAT_CONFIG[fmt].icon}
                  <span>{FORMAT_CONFIG[fmt].label}</span>
                  {fmt === format && (
                    <span className="ml-auto text-[var(--accent)]">•</span>
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Examples */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono
                               text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                               hover:bg-[var(--bg-surface)] transition-colors">
              <BookOpen size={13} />
              <span>Examples</span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[220px] bg-[var(--bg-elevated)] border border-[var(--border-default)]
                         rounded-lg p-1 shadow-xl shadow-black/40 z-50 animate-fade-in"
              sideOffset={4}
              align="end"
            >
              {EXAMPLE_SCHEMAS.map((example) => (
                <DropdownMenu.Item
                  key={example.label}
                  className="flex flex-col gap-0.5 px-3 py-2 rounded-md cursor-pointer outline-none
                             data-[highlighted]:bg-[var(--accent-subtle)]"
                  onSelect={() => loadExample(example)}
                >
                  <span className="text-xs font-mono text-[var(--text-secondary)] data-[highlighted]:text-[var(--accent)]">
                    {example.label}
                  </span>
                  <span className="text-[0.6875rem] text-[var(--text-muted)]">
                    {example.description} · {FORMAT_CONFIG[example.format].label}
                  </span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={config.monacoLang}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontLigatures: true,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            padding: { top: 12, bottom: 12 },
            scrollBeyondLastLine: false,
            wordWrap: format === "english" ? "on" : "off",
            tabSize: 2,
            renderLineHighlight: "gutter",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  );
}
