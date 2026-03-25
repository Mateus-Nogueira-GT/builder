// components/PreviewToolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Monitor,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "desktop" | "mobile";

interface PreviewToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  primaryColor: string;
  secondaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  onSecondaryColorChange: (color: string) => void;
  onPublish: () => void;
  onBack: () => void;
  publishing: boolean;
}

export function PreviewToolbar({
  viewMode,
  onViewModeChange,
  primaryColor,
  secondaryColor,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onPublish,
  onBack,
  publishing,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-zinc-900 border-b border-zinc-800 px-4 py-3">
      {/* Left: Back + Device toggle */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>

        <div className="flex items-center bg-zinc-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("desktop")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "desktop"
                ? "bg-emerald-500 text-black"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("mobile")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "mobile"
                ? "bg-emerald-500 text-black"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
        </div>
      </div>

      {/* Right: Color pickers + Publish */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-zinc-400">Primária</span>
            <div className="relative">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                className="sr-only"
              />
              <div
                className="h-7 w-7 rounded-full border-2 border-zinc-600 hover:border-zinc-400 transition-colors cursor-pointer"
                style={{ backgroundColor: primaryColor }}
                onClick={(e) => {
                  const input = (e.currentTarget as HTMLElement)
                    .previousElementSibling as HTMLInputElement;
                  input?.click();
                }}
              />
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-zinc-400">Secundária</span>
            <div className="relative">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                className="sr-only"
              />
              <div
                className="h-7 w-7 rounded-full border-2 border-zinc-600 hover:border-zinc-400 transition-colors cursor-pointer"
                style={{ backgroundColor: secondaryColor }}
                onClick={(e) => {
                  const input = (e.currentTarget as HTMLElement)
                    .previousElementSibling as HTMLInputElement;
                  input?.click();
                }}
              />
            </div>
          </label>
        </div>

        <Button
          onClick={onPublish}
          disabled={publishing}
          size="sm"
          className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
        >
          {publishing ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Publicando...
            </>
          ) : (
            <>
              Publicar Loja <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
