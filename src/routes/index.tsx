import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { CameraView } from "@/components/photoshoot/CameraView";
import { PhotoEditor } from "@/components/photoshoot/PhotoEditor";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "snap. — Mobile Photoshoot with Emoji Stickers" },
      {
        name: "description",
        content:
          "Snap photos right from your browser, decorate with draggable emoji stickers, apply filters, and download. Mobile-first, no install.",
      },
      { property: "og:title", content: "snap. — Browser Photoshoot Studio" },
      {
        property: "og:description",
        content: "Capture, sticker, download. A lightweight mobile-first photo booth.",
      },
    ],
  }),
});

function Index() {
  const [photos, setPhotos] = useState<string[] | null>(null);

  return (
    <main className="fixed inset-0 flex flex-col bg-surface">
      <h1 className="sr-only">snap. mobile photoshoot studio</h1>
      <CameraView onCapture={setPhotos} />
      {photos && photos.length > 0 && (
        <PhotoEditor imageDataUrls={photos} onClose={() => setPhotos(null)} />
      )}
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.22 0.015 40)",
            color: "oklch(0.98 0.005 60)",
            border: "1px solid oklch(1 0 0 / 0.1)",
          },
        }}
      />
    </main>
  );
}
