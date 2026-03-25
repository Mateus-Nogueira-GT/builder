"use client";

import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-white group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-zinc-400",
          actionButton: "group-[.toast]:bg-emerald-500 group-[.toast]:text-black",
          cancelButton: "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-300",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
