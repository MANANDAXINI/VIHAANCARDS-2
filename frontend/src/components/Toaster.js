"use client";

import { useEffect, useState } from "react";
import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  const [position, setPosition] = useState("top-right");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setPosition(media.matches ? "top-center" : "top-right");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <SonnerToaster
      position={position}
      richColors
      closeButton
      offset={position === "top-center" ? 88 : 16}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}
