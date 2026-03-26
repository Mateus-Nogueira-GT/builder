"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldDef {
  key: string;
  label: string;
  value: string;
  type?: "text" | "textarea";
}

interface ContentBlockProps {
  title: string;
  isComplete: boolean;
  fields: FieldDef[];
  onFieldChange: (key: string, value: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function ContentBlock({
  title,
  isComplete,
  fields,
  onFieldChange,
  onRegenerate,
  isRegenerating,
}: ContentBlockProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full",
              isComplete ? "bg-emerald-500" : "bg-zinc-700"
            )}
          >
            {isComplete ? (
              <Check className="h-3 w-3 text-black" />
            ) : (
              <AlertCircle className="h-3 w-3 text-zinc-400" />
            )}
          </div>
          <span className="flex-1">{title}</span>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition-colors disabled:opacity-50"
              title="Regenerar este bloco"
            >
              <RotateCcw
                className={cn(
                  "h-3.5 w-3.5",
                  isRegenerating && "animate-spin"
                )}
              />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                value={field.value}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                rows={3}
                className="flex w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            ) : (
              <Input
                value={field.value}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
