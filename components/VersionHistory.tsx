"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { History, Loader2, Clock, RotateCcw, Sparkles } from "lucide-react";
import type { StoreContent } from "@/lib/schemas";

interface VersionEntry {
  id: string;
  trigger: string;
  block_name: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  storeId: string | null;
  onRestore: (content: StoreContent) => void;
}

const BLOCK_LABELS: Record<string, string> = {
  topbar: "Topbar",
  whatsapp: "WhatsApp",
  trustBar: "Trust Bar",
  promoBanner: "Promo Banner",
  categories: "Categorias",
  testimonials: "Depoimentos",
  footer: "Footer",
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour}h`;
  return `há ${diffDay}d`;
}

export function VersionHistory({ storeId, onRestore }: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchVersions = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content-versions?storeId=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchVersions();
    }
    setIsOpen(!isOpen);
  };

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/content-versions/${versionId}`);
      if (!res.ok) return;
      const data = await res.json();
      onRestore(data.content);
      setIsOpen(false);
    } catch {
      // silent fail
    } finally {
      setRestoring(null);
    }
  };

  if (!storeId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={handleToggle}
        className="border-zinc-700 text-zinc-300 hover:border-emerald-500"
      >
        <History className="mr-2 h-4 w-4" /> Histórico
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="p-3 border-b border-zinc-800">
            <h4 className="text-sm font-semibold text-white">Versões Anteriores</h4>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              </div>
            ) : versions.length === 0 ? (
              <div className="py-6 text-center text-sm text-zinc-500">
                Nenhuma versão anterior
              </div>
            ) : (
              versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => handleRestore(version.id)}
                  disabled={restoring !== null}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                    {version.trigger === "full_regeneration" ? (
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {version.trigger === "full_regeneration"
                        ? "Regeneração completa"
                        : `Regeneração: ${BLOCK_LABELS[version.block_name || ""] || version.block_name}`}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(version.created_at)}
                    </div>
                  </div>
                  {restoring === version.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
