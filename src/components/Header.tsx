"use client";

import { Settings, Github, Zap } from "lucide-react";

interface HeaderProps {
  onOpenConfig: () => void;
}

export function Header({ onOpenConfig }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--accent-muted)] border border-[var(--accent)]/20">
          <Zap size={16} className="text-forge-400" />
        </div>
        <div>
          <h1 className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Perspect
          </h1>
          <p className="text-[0.6875rem] font-mono text-[var(--text-muted)] -mt-0.5">
            schema → type-safe code
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenConfig}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono
                     text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                     hover:bg-[var(--bg-surface)] transition-colors"
          aria-label="Configuration settings"
        >
          <Settings size={14} />
          <span>Config</span>
        </button>
        <a
          href="https://github.com/ZonaGilreath/perspect"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-8 h-8 rounded-md
                     text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                     hover:bg-[var(--bg-surface)] transition-colors"
          aria-label="View on GitHub"
        >
          <Github size={16} />
        </a>
      </div>
    </header>
  );
}
