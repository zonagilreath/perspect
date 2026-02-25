"use client";

import { useState, useCallback, useRef } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";

import { Header } from "@/components/Header";
import { SchemaEditor } from "@/components/SchemaEditor";
import { OutputPanel } from "@/components/OutputPanel";
import { ConfigDialog } from "@/components/ConfigDialog";

import type {
  InputFormat,
  GenerationTarget,
  GenerationConfig,
  DatabaseSchema,
} from "@/types/schema";

const DEFAULT_CONFIG: GenerationConfig = {
  formLibrary: "react-hook-form",
  ormStyle: "prisma",
  apiStyle: "trpc",
  includeComments: true,
  strictMode: true,
};

const GENERATION_ORDER: GenerationTarget[] = [
  "zod",
  "types",
  "trpc",
  "react-form",
];

export default function Home() {
  // ─── State ──────────────────────────────────────────────────────────────
  const [schemaInput, setSchemaInput] = useState("");
  const [inputFormat, setInputFormat] = useState<InputFormat>("prisma");
  const [config, setConfig] = useState<GenerationConfig>(DEFAULT_CONFIG);
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GenerationTarget>("zod");
  const [outputs, setOutputs] = useState<Record<GenerationTarget, string>>({
    zod: "",
    trpc: "",
    "react-form": "",
    types: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingTarget, setStreamingTarget] = useState<GenerationTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ─── Parse schema ───────────────────────────────────────────────────────
  const parseSchema = useCallback(
    async (signal: AbortSignal): Promise<DatabaseSchema | null> => {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: schemaInput, format: inputFormat }),
        signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to parse schema");
      }

      return res.json();
    },
    [schemaInput, inputFormat]
  );

  // ─── Generate code for a single target (streaming) ──────────────────────
  const generateTarget = useCallback(
    async (
      schema: DatabaseSchema,
      target: GenerationTarget,
      signal: AbortSignal
    ) => {
      setStreamingTarget(target);
      setActiveTab(target);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, target, config }),
        signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to generate ${target}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        setOutputs((prev) => ({ ...prev, [target]: accumulated }));
      }

      return accumulated;
    },
    [config]
  );

  // ─── Full generation pipeline ───────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!schemaInput.trim()) return;

    // Cancel previous generation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setError(null);
    setOutputs({ zod: "", trpc: "", "react-form": "", types: "" });

    try {
      // Step 1: Parse schema
      const schema = await parseSchema(controller.signal);
      if (!schema) throw new Error("Failed to parse schema");
      if (schema.models.length === 0) {
        throw new Error("No models found in schema. Check your input format.");
      }

      // Step 2: Generate each target sequentially (so user can watch each one stream in)
      for (const target of GENERATION_ORDER) {
        if (controller.signal.aborted) break;
        await generateTarget(schema, target, controller.signal);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
      setStreamingTarget(null);
    }
  }, [schemaInput, parseSchema, generateTarget]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setStreamingTarget(null);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col">
      <Header onOpenConfig={() => setConfigOpen(true)} />

      {/* Error bar */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 animate-slide-up">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-400 font-mono">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs text-red-400/60 hover:text-red-400 font-mono"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal">
          {/* Left pane: Schema input */}
          <Panel defaultSize={45} minSize={30}>
            <SchemaEditor
              value={schemaInput}
              onChange={setSchemaInput}
              format={inputFormat}
              onFormatChange={setInputFormat}
            />
          </Panel>

          <PanelResizeHandle className="w-[3px]" />

          {/* Right pane: Generated output */}
          <Panel defaultSize={55} minSize={30}>
            <OutputPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              outputs={outputs}
              isStreaming={isGenerating}
              streamingTarget={streamingTarget}
            />
          </Panel>
        </PanelGroup>
      </div>

      {/* Bottom bar with generate button */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          {isGenerating && streamingTarget && (
            <span className="text-xs font-mono text-[var(--text-muted)] animate-fade-in">
              Generating{" "}
              <span className="text-[var(--accent)]">{streamingTarget}</span>
              ...
            </span>
          )}
          {!isGenerating && outputs.zod && (
            <span className="text-xs font-mono text-[var(--success)]/70 animate-fade-in">
              ✓ All targets generated
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isGenerating && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-xs font-mono font-medium
                         text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                         border border-[var(--border-subtle)] hover:border-[var(--border-default)]
                         transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !schemaInput.trim()}
            className="btn-generate flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-mono font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Config dialog */}
      <ConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        config={config}
        onConfigChange={setConfig}
      />
    </div>
  );
}
