"use client";

import { cn } from "@/lib/utils";
import { Check, Upload } from "lucide-react";
import type { ImageItem } from "@/lib/imageBank";

interface ImageGridProps {
  images: ImageItem[];
  selectedId?: string;
  onSelect: (image: ImageItem) => void;
  onUpload?: () => void;
}

export function ImageGrid({ images, selectedId, onSelect, onUpload }: ImageGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {images.map((image) => {
        const isSelected = image.id === selectedId;
        return (
          <button
            key={image.id}
            type="button"
            onClick={() => onSelect(image)}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
              isSelected
                ? "border-emerald-500 ring-2 ring-emerald-500/30"
                : "border-zinc-700 hover:border-zinc-500"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.label}
              className="h-full w-full object-cover"
            />
            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-4 w-4 text-black" />
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <span className="text-[10px] font-medium text-white">{image.label}</span>
            </div>
          </button>
        );
      })}

      {onUpload && (
        <button
          type="button"
          onClick={onUpload}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-emerald-500 hover:text-emerald-400"
        >
          <Upload className="h-5 w-5" />
          <span className="text-[10px] font-medium">Upload</span>
        </button>
      )}
    </div>
  );
}
