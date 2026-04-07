"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function AccordionSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: AccordionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-zinc-900 px-4 py-3 text-left hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-emerald-500">{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-zinc-500 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
      </button>
      <div
        className="transition-[max-height] duration-200 ease-in-out overflow-hidden"
        style={{ maxHeight: isOpen ? `${height}px` : "0px" }}
      >
        <div ref={contentRef} className="bg-zinc-950 px-4 py-3 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
