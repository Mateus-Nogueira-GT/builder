"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Settings, Shirt } from "lucide-react";

interface StoreCardProps {
  id: string;
  name: string;
  siteUrl?: string | null;
  lastInjection?: string;
  onConfigure: () => void;
}

export function StoreCard({ name, siteUrl, lastInjection, onConfigure }: StoreCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Shirt className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{name}</h3>
              {siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                >
                  {siteUrl.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <Badge variant="secondary">
            {siteUrl ? "Publicada" : "Rascunho"}
          </Badge>
        </div>

        {lastInjection && (
          <p className="text-xs text-zinc-500">
            Criada em {new Date(lastInjection).toLocaleDateString("pt-BR")}
          </p>
        )}

        <button
          type="button"
          onClick={onConfigure}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 transition-colors hover:border-emerald-500 hover:text-emerald-400"
        >
          <Settings className="h-4 w-4" />
          Reconfigurar
        </button>
      </CardContent>
    </Card>
  );
}
