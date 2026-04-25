import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Image as ImageIcon, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

interface CameraViewProps {
  onCapture: (dataUrl: string) => void;
}

const FILTERS = [
  { id: "none", name: "Original", css: "none" },
  { id: "warm", name: "Warm", css: "saturate(1.2) contrast(1.05) sepia(0.15)" },
  { id: "cool", name: "Cool", css: "saturate(1.1) hue-rotate(-10deg) brightness(1.05)" },
  { id: "mono", name: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "vivid", name: "Vivid", css: "saturate(1.6) contrast(1.15)" },
  { id: "fade", name: "Fade", css: "contrast(0.9) brightness(1.1) saturate(0.85)" },
];

export function CameraView({ onCapture }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterId, setFilterId] = useState("none");
  const [showFilters, setShowFilters] = useState(false);
  const [flashing, setFlashing] = useState(false);

  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          setError(null);
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Tidak dapat mengakses kamera";
        setError(msg);
      }
    }
    start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.filter = filter.css;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setFlashing(true);
    setTimeout(() => setFlashing(false), 500);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setTimeout(() => onCapture(dataUrl), 200);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCapture(reader.result as string);
    reader.onerror = () => toast.error("Gagal memuat gambar");
    reader.readAsDataURL(file);
  };

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
          <X className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Akses kamera ditolak</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Izinkan kamera lewat ikon gembok di address bar, lalu reload.
          </p>
        </div>
        <label className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-bounce active:scale-95">
          <ImageIcon className="mr-2 inline h-4 w-4" />
          Pilih dari galeri
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </label>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{
          filter: filter.css,
          transform: facingMode === "user" ? "scaleX(-1)" : undefined,
        }}
      />

      {/* Flash overlay */}
      {flashing && (
        <div className="pointer-events-none absolute inset-0 bg-white animate-flash" />
      )}

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
        <div className="rounded-full bg-surface/60 px-3 py-1.5 backdrop-blur-md">
          <span className="font-display text-sm font-semibold text-surface-foreground">
            snap<span className="text-primary-glow">.</span>
          </span>
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/60 text-surface-foreground backdrop-blur-md transition-bounce active:scale-90"
          aria-label="Filter"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      </div>

      {/* Filter strip */}
      {showFilters && (
        <div className="absolute bottom-36 left-0 right-0 px-4 animate-pop-in">
          <div className="flex gap-2 overflow-x-auto rounded-2xl bg-surface/70 p-2 backdrop-blur-md scrollbar-none">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterId(f.id)}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-medium transition-smooth ${
                  filterId === f.id
                    ? "bg-primary text-primary-foreground"
                    : "text-surface-foreground/80 hover:bg-white/10"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-8 pb-10 pt-6">
        <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-surface/60 text-surface-foreground backdrop-blur-md transition-bounce active:scale-90">
          <ImageIcon className="h-5 w-5" />
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </label>

        <button
          onClick={handleCapture}
          disabled={!ready}
          aria-label="Ambil foto"
          className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-capture transition-bounce active:scale-90 disabled:opacity-50"
        >
          <span className="absolute inset-0 rounded-full animate-pulse-ring" />
          <span className="h-16 w-16 rounded-full bg-gradient-primary transition-smooth group-active:scale-90" />
          <Camera className="absolute h-7 w-7 text-primary-foreground" />
        </button>

        <button
          onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          aria-label="Balik kamera"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface/60 text-surface-foreground backdrop-blur-md transition-bounce active:scale-90 active:rotate-180"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
