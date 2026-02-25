"use client";

import { useRef, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import * as Tabs from "@radix-ui/react-tabs";
import { Copy, Check, Download, Loader2 } from "lucide-react";
import type { GenerationTarget } from "@/types/schema";

interface OutputPanelProps {
  activeTab: GenerationTarget;
  onTabChange: (tab: GenerationTarget) => void;
  outputs: Record<GenerationTarget, string>;
  isStreaming: boolean;
  streamingTarget: GenerationTarget | null;
}

const TABS: { value: GenerationTarget; label: string; filename: string }[] = [
  { value: "zod", label: "Zod", filename: "schemas.ts" },
  { value: "trpc", label: "tRPC", filename: "router.ts" },
  { value: "react-form", label: "Forms", filename: "forms.tsx" },
  { value: "types", label: "Types", filename: "types.ts" },
];

export function OutputPanel({
  activeTab,
  onTabChange,
  outputs,
  isStreaming,
  streamingTarget,
}: OutputPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const currentOutput = outputs[activeTab] || "";
  const isCurrentlyStreaming = isStreaming && streamingTarget === activeTab;

  const handleCopy = useCallback(async () => {
    if (!currentOutput) return;
    await navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentOutput]);

  const handleDownload = useCallback(() => {
    if (!currentOutput) return;
    const tab = TABS.find((t) => t.value === activeTab);
    const blob = new Blob([currentOutput], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab?.filename ?? "output.ts";
    a.click();
    URL.revokeObjectURL(url);
  }, [currentOutput, activeTab]);

  return (
    <div className="flex flex-col h-full">
      <Tabs.Root
        value={activeTab}
        onValueChange={(v) => onTabChange(v as GenerationTarget)}
        className="flex flex-col h-full"
      >
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <Tabs.List className="flex">
            {TABS.map((tab) => {
              const hasContent = !!outputs[tab.value];
              const isTabStreaming = isStreaming && streamingTarget === tab.value;

              return (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className="tab-trigger flex items-center gap-1.5"
                >
                  {isTabStreaming && (
                    <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
                  )}
                  <span>{tab.label}</span>
                  {hasContent && !isTabStreaming && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] opacity-60" />
                  )}
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          {/* Actions */}
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={handleCopy}
              disabled={!currentOutput}
              className="flex items-center gap-1 px-2 py-1 rounded text-[0.6875rem] font-mono
                         text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Copy to clipboard"
            >
              {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!currentOutput}
              className="flex items-center gap-1 px-2 py-1 rounded text-[0.6875rem] font-mono
                         text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Download file"
            >
              <Download size={12} />
            </button>
          </div>
        </div>

        {/* Content */}
        {TABS.map((tab) => (
          <Tabs.Content
            key={tab.value}
            value={tab.value}
            className="flex-1 min-h-0"
            forceMount
            style={{ display: tab.value === activeTab ? "flex" : "none" }}
          >
            {outputs[tab.value] ? (
              <div className="w-full h-full relative">
                <Editor
                  height="100%"
                  language="typescript"
                  value={outputs[tab.value]}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontLigatures: true,
                    lineNumbers: "on",
                    lineNumbersMinChars: 3,
                    padding: { top: 12, bottom: 12 },
                    scrollBeyondLastLine: false,
                    tabSize: 2,
                    renderLineHighlight: "none",
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    scrollbar: {
                      verticalScrollbarSize: 6,
                      horizontalScrollbarSize: 6,
                    },
                  }}
                />
                {isStreaming && streamingTarget === tab.value && (
                  <div className="absolute bottom-3 right-4 streaming-indicator" />
                )}
              </div>
            ) : (
              <EmptyState tab={tab} />
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

function EmptyState({ tab }: { tab: (typeof TABS)[number] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                      flex items-center justify-center">
        <span className="font-mono text-sm text-[var(--text-muted)]">
          {tab.filename.split(".")[1]}
        </span>
      </div>
      <div>
        <p className="text-sm text-[var(--text-muted)]">
          No {tab.label.toLowerCase()} generated yet
        </p>
        <p className="text-xs text-[var(--text-muted)]/60 mt-1">
          Paste a schema and hit Generate
        </p>
      </div>
    </div>
  );
}

// Need React import for useState
import React from "react";
