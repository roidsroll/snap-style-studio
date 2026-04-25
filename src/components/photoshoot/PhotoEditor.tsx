import { useEffect, useRef, useState } from "react";
import { Download, X, Trash2, Smile, Plus, ChevronLeft, ChevronRight, DownloadCloud, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PhotoEditorProps {
  imageDataUrls: string[];
  onClose: () => void;
}

interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

const EMOJI_LIBRARY = [
  "😀","😂","🥰","😎","🤩","😍","🥳","😜","🤔","😴",
  "❤️","🔥","✨","⭐","💯","💖","💫","🌟","💥","🎉",
  "🌸","🌺","🌻","🌷","🌹","🌈","☀️","🌙","☁️","⚡",
  "🍕","🍔","🍩","🍦","🍓","🍑","🥑","🍷","☕","🍺",
  "🐶","🐱","🐼","🦊","🐻","🐰","🦄","🐢","🦋","🐝",
  "👑","🎀","💎","🎁","🎈","🎊","📸","🎨","🎵","💌",
];

let stickerCounter = 0;
const newId = () => `s_${Date.now()}_${stickerCounter++}`;

async function renderPhoto(
  imageDataUrl: string,
  stickers: Sticker[],
  displayedWidth: number,
): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageDataUrl;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Gagal memuat gambar"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");

  ctx.drawImage(img, 0, 0);

  const scale = img.naturalWidth / (displayedWidth || img.naturalWidth);

  for (const s of stickers) {
    const sizePx = s.size * scale;
    const cx = s.x * canvas.width;
    const cy = s.y * canvas.height;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.font = `${sizePx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.emoji, 0, 0);
    ctx.restore();
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat gambar"))),
      "image/png",
      1.0,
    );
  });
}

export function PhotoEditor({ imageDataUrls, onClose }: PhotoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  // Per-photo sticker arrays, indexed by photo position
  const [stickersByPhoto, setStickersByPhoto] = useState<Sticker[][]>(() =>
    imageDataUrls.map(() => []),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [downloading, setDownloading] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  const stickers = stickersByPhoto[activeIdx] ?? [];
  const setStickers = (updater: (prev: Sticker[]) => Sticker[]) => {
    setStickersByPhoto((all) =>
      all.map((arr, i) => (i === activeIdx ? updater(arr) : arr)),
    );
  };

  useEffect(() => {
    setSelected(null);
    setPickerOpen(false);
  }, [activeIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "Delete" && selected) {
        setStickers((s) => s.filter((x) => x.id !== selected));
        setSelected(null);
      }
      if (e.key === "ArrowLeft") setActiveIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setActiveIdx((i) => Math.min(imageDataUrls.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, imageDataUrls.length]);

  const updateImgSize = () => {
    if (imgRef.current) {
      setImgSize({
        w: imgRef.current.clientWidth,
        h: imgRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    window.addEventListener("resize", updateImgSize);
    return () => window.removeEventListener("resize", updateImgSize);
  }, []);

  const addEmoji = (emoji: string) => {
    const id = newId();
    setStickers((s) => [
      ...s,
      { id, emoji, x: 0.5, y: 0.5, size: 64, rotation: 0 },
    ]);
    setSelected(id);
    setPickerOpen(false);
  };

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelected(id);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startSticker = stickers.find((s) => s.id === id);
    if (!startSticker) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = startSticker.x;
    const origY = startSticker.y;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;
      setStickers((arr) =>
        arr.map((s) =>
          s.id === id
            ? {
                ...s,
                x: Math.max(0, Math.min(1, origX + dx)),
                y: Math.max(0, Math.min(1, origY + dy)),
              }
            : s,
        ),
      );
    };
    const onUp = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const startTransform = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;

    const cx = rect.left + sticker.x * rect.width;
    const cy = rect.top + sticker.y * rect.height;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const startDist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const origRotation = sticker.rotation;
    const origSize = sticker.size;

    const onMove = (ev: PointerEvent) => {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy);
      const rotDelta = ((angle - startAngle) * 180) / Math.PI;
      const newSize = Math.max(28, Math.min(360, origSize * (dist / startDist)));
      setStickers((arr) =>
        arr.map((s) =>
          s.id === id
            ? { ...s, rotation: origRotation + rotDelta, size: newSize }
            : s,
        ),
      );
    };
    const onUp = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const removeSticker = (id: string) => {
    setStickers((s) => s.filter((x) => x.id !== id));
    setSelected(null);
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadCurrent = async () => {
    if (!imgRef.current) return;
    setDownloading(true);
    try {
      const blob = await renderPhoto(
        imageDataUrls[activeIdx],
        stickers,
        imgRef.current.clientWidth,
      );
      triggerDownload(blob, `snap-${Date.now()}-${activeIdx + 1}.png`);
      toast.success("Foto berhasil diunduh ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!imgRef.current) return;
    setDownloading(true);
    const displayedWidth = imgRef.current.clientWidth;
    try {
      for (let i = 0; i < imageDataUrls.length; i++) {
        const blob = await renderPhoto(
          imageDataUrls[i],
          stickersByPhoto[i] ?? [],
          displayedWidth,
        );
        triggerDownload(blob, `snap-${Date.now()}-${i + 1}.png`);
        // small spacing so browsers handle multiple downloads
        await new Promise((r) => setTimeout(r, 250));
      }
      toast.success(`${imageDataUrls.length} foto berhasil diunduh ✨`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh");
    } finally {
      setDownloading(false);
    }
  };

  const multi = imageDataUrls.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface text-surface-foreground animate-pop-in">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-bounce active:scale-90"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="font-display text-sm font-semibold">
          {multi ? `Foto ${activeIdx + 1} / ${imageDataUrls.length}` : "Edit foto"}
        </span>
        <div className="flex items-center gap-2">
          {multi && (
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-surface-foreground transition-bounce active:scale-95 disabled:opacity-60"
              aria-label="Unduh semua"
            >
              <DownloadCloud className="h-4 w-4" />
              Semua
            </button>
          )}
          <button
            onClick={handleDownloadCurrent}
            disabled={downloading}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-bounce active:scale-95 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? "..." : "Simpan"}
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-2"
        onClick={() => setSelected(null)}
      >
        {multi && activeIdx > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveIdx((i) => Math.max(0, i - 1));
            }}
            aria-label="Foto sebelumnya"
            className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-bounce active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {multi && activeIdx < imageDataUrls.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveIdx((i) => Math.min(imageDataUrls.length - 1, i + 1));
            }}
            aria-label="Foto berikutnya"
            className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-bounce active:scale-90"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div
          ref={containerRef}
          className="relative max-h-full max-w-full"
          style={{ touchAction: "none" }}
        >
          <img
            ref={imgRef}
            key={activeIdx}
            src={imageDataUrls[activeIdx]}
            alt={`Preview ${activeIdx + 1}`}
            onLoad={updateImgSize}
            className="block max-h-[calc(100vh-300px)] max-w-full rounded-2xl shadow-soft"
            draggable={false}
          />
          {imgSize.w > 0 &&
            stickers.map((s) => {
              const isSel = s.id === selected;
              return (
                <div
                  key={s.id}
                  className="absolute select-none"
                  style={{
                    left: `${s.x * imgSize.w}px`,
                    top: `${s.y * imgSize.h}px`,
                    transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                    touchAction: "none",
                  }}
                >
                  <div
                    onPointerDown={(e) => startDrag(e, s.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(s.id);
                    }}
                    className={`relative cursor-grab active:cursor-grabbing transition-smooth ${
                      isSel ? "ring-2 ring-primary-glow ring-offset-2 ring-offset-transparent rounded-lg" : ""
                    }`}
                    style={{
                      fontSize: `${s.size}px`,
                      lineHeight: 1,
                      padding: "4px",
                    }}
                  >
                    <span style={{ display: "block" }}>{s.emoji}</span>

                    {isSel && (
                      <>
                        <button
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            removeSticker(s.id);
                          }}
                          className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-soft"
                          aria-label="Hapus"
                          style={{ fontSize: "14px" }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div
                          onPointerDown={(e) => startTransform(e, s.id)}
                          className="absolute -bottom-3 -right-3 flex h-7 w-7 cursor-nwse-resize items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft"
                          aria-label="Ubah ukuran & rotasi"
                          style={{ fontSize: "14px" }}
                        >
                          <Plus className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Thumbnail strip for multi-shot */}
      {multi && (
        <div className="px-3 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {imageDataUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`relative shrink-0 overflow-hidden rounded-lg transition-bounce ${
                  i === activeIdx
                    ? "ring-2 ring-primary scale-105"
                    : "ring-1 ring-white/15 opacity-70"
                }`}
                aria-label={`Pilih foto ${i + 1}`}
              >
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="h-14 w-14 object-cover"
                  draggable={false}
                />
                {(stickersByPhoto[i]?.length ?? 0) > 0 && (
                  <span className="absolute right-0.5 top-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {stickersByPhoto[i].length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="border-t border-white/10 bg-surface/80 p-4 pb-6 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setPickerOpen((p) => !p)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-medium transition-bounce active:scale-95"
          >
            <Smile className="h-5 w-5 text-primary-glow" />
            {pickerOpen ? "Tutup emoji" : "Tambah emoji"}
          </button>
          {selected && (
            <button
              onClick={() => removeSticker(selected)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/20 text-destructive transition-bounce active:scale-90"
              aria-label="Hapus stiker terpilih"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        {pickerOpen && (
          <div className="mt-3 max-h-48 overflow-y-auto rounded-2xl bg-white/5 p-3 animate-pop-in">
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
              {EMOJI_LIBRARY.map((e) => (
                <button
                  key={e}
                  onClick={() => addEmoji(e)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition-bounce hover:bg-white/10 active:scale-90"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-white/50">
          {multi
            ? "Setiap foto bisa dihias terpisah · Geser untuk pindah stiker"
            : "Geser untuk pindah · Tarik titik biru untuk ukuran & putar"}
        </p>
      </div>
    </div>
  );
}
