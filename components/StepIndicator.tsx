"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isCompleted && "bg-emerald-500 text-black",
                  isCurrent && "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500",
                  !isCompleted && !isCurrent && "bg-zinc-800 text-zinc-500"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isCurrent ? "text-emerald-400" : isCompleted ? "text-zinc-300" : "text-zinc-600"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-px w-8",
                  index < currentStep ? "bg-emerald-500" : "bg-zinc-800"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
