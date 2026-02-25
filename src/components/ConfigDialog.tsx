"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { GenerationConfig } from "@/types/schema";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: GenerationConfig;
  onConfigChange: (config: GenerationConfig) => void;
}

export function ConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
}: ConfigDialogProps) {
  const update = <K extends keyof GenerationConfig>(
    key: K,
    value: GenerationConfig[K]
  ) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[420px] max-h-[85vh] overflow-y-auto
                     bg-[var(--bg-elevated)] border border-[var(--border-default)]
                     rounded-xl shadow-2xl shadow-black/50 z-50 animate-slide-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <div>
              <Dialog.Title className="font-display text-sm font-semibold text-[var(--text-primary)]">
                Generation Config
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--text-muted)] mt-0.5">
                Customize the generated code output
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-md
                           text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                           hover:bg-[var(--bg-surface)] transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* API Style */}
            <OptionGroup
              label="API Style"
              value={config.apiStyle}
              onChange={(v) => update("apiStyle", v as "trpc" | "rest")}
              options={[
                { value: "trpc", label: "tRPC", desc: "Type-safe end-to-end" },
                { value: "rest", label: "REST", desc: "Express-style handlers" },
              ]}
            />

            {/* Form Library */}
            <OptionGroup
              label="Form Library"
              value={config.formLibrary}
              onChange={(v) => update("formLibrary", v as "react-hook-form" | "native")}
              options={[
                { value: "react-hook-form", label: "React Hook Form", desc: "With Zod resolver" },
                { value: "native", label: "Native State", desc: "useState + manual validation" },
              ]}
            />

            {/* ORM */}
            <OptionGroup
              label="ORM Style"
              value={config.ormStyle}
              onChange={(v) => update("ormStyle", v as "prisma" | "drizzle")}
              options={[
                { value: "prisma", label: "Prisma", desc: "Prisma Client queries" },
                { value: "drizzle", label: "Drizzle", desc: "Drizzle ORM queries" },
              ]}
            />

            {/* Toggles */}
            <div className="space-y-3">
              <Toggle
                label="Include comments"
                description="JSDoc annotations on generated code"
                checked={config.includeComments}
                onChange={(v) => update("includeComments", v)}
              />
              <Toggle
                label="Strict mode"
                description="z.string().min(1) for required strings"
                checked={config.strictMode}
                onChange={(v) => update("strictMode", v)}
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function OptionGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; desc: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-2">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col gap-0.5 p-3 rounded-lg border text-left transition-all
              ${
                value === opt.value
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                  : "border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-secondary)]"
              }`}
          >
            <span
              className={`text-xs font-mono font-medium ${
                value === opt.value
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {opt.label}
            </span>
            <span className="text-[0.625rem] text-[var(--text-muted)]">
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="pt-0.5">
        <button
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`w-9 h-5 rounded-full transition-colors relative ${
            checked ? "bg-[var(--accent)]" : "bg-[var(--bg-surface)]"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              checked ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <div>
        <span className="text-xs font-mono font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          {label}
        </span>
        <p className="text-[0.625rem] text-[var(--text-muted)]">{description}</p>
      </div>
    </label>
  );
}
