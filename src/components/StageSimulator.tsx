import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Pause, Play, Upload, XCircle } from 'lucide-react';
import type { StageScreen } from '../types/portal';
import { formatDuration, getExtension, validateMediaForHolyrics } from '../utils/holyrics';

interface StageSimulatorProps {
  screens: StageScreen[];
  initialUrl?: string;
  initialFilename?: string;
  onFilePicked?: (file: File) => void;
}

interface LoadedPreviewMedia {
  url: string;
  filename: string;
  kind: 'video' | 'image';
  width: number;
  height: number;
  duration?: number;
  fileSizeBytes: number;
}

function drawFrameToCanvas(
  canvas: HTMLCanvasElement | null,
  source: HTMLVideoElement | HTMLImageElement | null,
  sourceW: number,
  sourceH: number,
  showLyricsOverlay: boolean,
  screenLabel: string,
  screenResolution: string,
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  ctx.fillStyle = '#07080B';
  ctx.fillRect(0, 0, cw, ch);

  if (source && sourceW > 0 && sourceH > 0) {
    const srcRatio = sourceW / sourceH;
    const dstRatio = cw / ch;
    let dw = cw;
    let dh = ch;
    if (srcRatio > dstRatio) {
      dh = cw / srcRatio;
    } else {
      dw = ch * srcRatio;
    }
    ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#0D1017';
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, cw - 32, ch - 32);

    ctx.fillStyle = '#F4F5F7';
    ctx.font = '600 21px "Host Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(screenLabel, cw / 2, ch / 2 - 8);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillText(`${screenResolution} · 16:9`, cw / 2, ch / 2 + 20);
  }

  if (showLyricsOverlay) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, ch * 0.62, cw, ch * 0.3);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.font = '600 25px "Host Grotesk", sans-serif';
    ctx.fillText('Pai, eu amo Tua presença', cw / 2, ch * 0.75);
    ctx.fillText('Teu sorriso é vida em mim', cw / 2, ch * 0.84);
    ctx.restore();
  }
}

export function StageSimulator({
  screens,
  initialUrl,
  initialFilename,
  onFilePicked,
}: StageSimulatorProps) {
  const [media, setMedia] = useState<LoadedPreviewMedia | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const centerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const leftScreen = screens.find((s) => s.code === 'LEFT') ?? screens[0];
  const centerScreen = screens.find((s) => s.code === 'CENTER') ?? screens[1];
  const rightScreen = screens.find((s) => s.code === 'RIGHT') ?? screens[2];

  const loadLocalFile = useCallback(
    async (file: File) => {
      setBlockError(null);
      const ext = getExtension(file.name);
      const preCheck = validateMediaForHolyrics({
        filename: file.name,
        fileSizeBytes: file.size,
        screens,
      });

      if (preCheck.status === 'REJECTED' || !preCheck.category) {
        setBlockError(preCheck.messages[0] || 'Arquivo bloqueado pelo padrão do Holyrics.');
        setMedia(null);
        return;
      }

      if (preCheck.category === 'AUDIO' || preCheck.category === 'DOCUMENT') {
        onFilePicked?.(file);
        return;
      }

      const isVideo = preCheck.category === 'VIDEO';
      const url = URL.createObjectURL(file);

      if (!isVideo) {
        const img = new Image();
        img.onload = () => {
          const fullCheck = validateMediaForHolyrics({
            filename: file.name,
            fileSizeBytes: file.size,
            widthPx: img.naturalWidth,
            heightPx: img.naturalHeight,
            screens,
          });
          if (fullCheck.status === 'REJECTED') {
            URL.revokeObjectURL(url);
            setBlockError(fullCheck.messages[0]);
            setMedia(null);
            return;
          }
          imgRef.current = img;
          setMedia({
            url,
            filename: file.name,
            kind: 'image',
            width: img.naturalWidth,
            height: img.naturalHeight,
            fileSizeBytes: file.size,
          });
          setIsPlaying(false);
          setDuration(0);
          setCurrentTime(0);
          onFilePicked?.(file);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          setBlockError(`Não foi possível abrir a imagem "${file.name}" (${ext}).`);
        };
        img.src = url;
        return;
      }

      const vid = document.createElement('video');
      vid.preload = 'auto';
      vid.muted = true;
      vid.playsInline = true;
      vid.onloadedmetadata = () => {
        const fullCheck = validateMediaForHolyrics({
          filename: file.name,
          fileSizeBytes: file.size,
          widthPx: vid.videoWidth,
          heightPx: vid.videoHeight,
          screens,
        });
        if (fullCheck.status === 'REJECTED') {
          URL.revokeObjectURL(url);
          setBlockError(fullCheck.messages[0]);
          setMedia(null);
          return;
        }
        const loaded: LoadedPreviewMedia = {
          url,
          filename: file.name,
          kind: 'video',
          width: vid.videoWidth,
          height: vid.videoHeight,
          duration: Number.isFinite(vid.duration) ? vid.duration : 0,
          fileSizeBytes: file.size,
        };
        setMedia(loaded);
        setDuration(loaded.duration ?? 0);
        setCurrentTime(0);
        setIsPlaying(true);
        onFilePicked?.(file);
      };
      vid.onerror = () => {
        URL.revokeObjectURL(url);
        setBlockError(`Não foi possível reproduzir "${file.name}" no navegador.`);
      };
      vid.src = url;
    },
    [onFilePicked, screens],
  );

  useEffect(() => {
    if (!initialUrl || !initialFilename) return;
    const ext = initialFilename.slice(initialFilename.lastIndexOf('.')).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'].includes(ext);
    if (isVideo) {
      const vid = document.createElement('video');
      vid.onloadedmetadata = () => {
        setMedia({
          url: initialUrl,
          filename: initialFilename,
          kind: 'video',
          width: vid.videoWidth,
          height: vid.videoHeight,
          duration: vid.duration,
          fileSizeBytes: 0,
        });
        setDuration(vid.duration || 0);
        setIsPlaying(true);
      };
      vid.src = initialUrl;
    } else {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setMedia({
          url: initialUrl,
          filename: initialFilename,
          kind: 'image',
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSizeBytes: 0,
        });
      };
      img.src = initialUrl;
    }
  }, [initialUrl, initialFilename]);

  useEffect(() => {
    const pv = videoRef.current;
    if (!pv) return;
    pv.loop = true;
    pv.muted = true;
    if (isPlaying) {
      pv.play().catch(() => setIsPlaying(false));
    } else {
      pv.pause();
    }
  }, [isPlaying, media]);

  useEffect(() => {
    let rafId = 0;

    const render = () => {
      const pv = videoRef.current;
      const source =
        media?.kind === 'video' ? pv : media?.kind === 'image' ? imgRef.current : null;
      const w = media?.width ?? 0;
      const h = media?.height ?? 0;

      drawFrameToCanvas(
        leftCanvasRef.current,
        source,
        w,
        h,
        showLyricsOverlay,
        leftScreen.label,
        `${leftScreen.widthPx}×${leftScreen.heightPx}`,
      );

      drawFrameToCanvas(
        centerCanvasRef.current,
        source,
        w,
        h,
        showLyricsOverlay,
        centerScreen.label,
        `${centerScreen.widthPx}×${centerScreen.heightPx}`,
      );

      drawFrameToCanvas(
        rightCanvasRef.current,
        source,
        w,
        h,
        showLyricsOverlay,
        rightScreen.label,
        `${rightScreen.widthPx}×${rightScreen.heightPx}`,
      );

      if (pv && media?.kind === 'video') {
        setCurrentTime(pv.currentTime || 0);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [media, showLyricsOverlay, leftScreen, centerScreen, rightScreen]);

  const handleSeek = (nextTime: number) => {
    setCurrentTime(nextTime);
    if (videoRef.current) videoRef.current.currentTime = nextTime;
  };

  const validation = media
    ? validateMediaForHolyrics({
        filename: media.filename,
        fileSizeBytes: media.fileSizeBytes,
        widthPx: media.width,
        heightPx: media.height,
        screens,
      })
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Prévia nos 3 telões (16:9)</h2>
          <p className="text-xs text-zinc-400">
            Confira enquadramento antes de enviar para o culto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLyricsOverlay((v) => !v)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${
              showLyricsOverlay
                ? 'border-[#0095FF] bg-[#0095FF]/15 text-white'
                : 'border-white/12 text-zinc-300 hover:bg-white/5'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>Testar letra por cima</span>
          </button>

          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-[#0095FF] px-4 text-xs font-semibold text-white hover:bg-[#0080DC]">
            <Upload className="h-4 w-4" />
            <span>{media ? 'Trocar mídia no telão' : 'Importar mídia no telão'}</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadLocalFile(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {media?.kind === 'video' && (
        <video ref={videoRef} src={media.url} className="hidden" playsInline muted />
      )}

      {/* 3 Telões proporcionais */}
      <div className="rounded-xl border border-white/10 bg-[#08090C] p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{leftScreen.label}</span>
              <span className="font-mono-tech">
                {leftScreen.widthPx}×{leftScreen.heightPx}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/12 bg-black aspect-video">
              <canvas
                ref={leftCanvasRef}
                width={640}
                height={360}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div className="md:col-span-6 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-300">
              <span className="font-semibold text-white">{centerScreen.label}</span>
              <span className="font-mono-tech">
                {centerScreen.widthPx}×{centerScreen.heightPx}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-[#0095FF]/40 bg-black aspect-video">
              <canvas
                ref={centerCanvasRef}
                width={960}
                height={540}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{rightScreen.label}</span>
              <span className="font-mono-tech">
                {rightScreen.widthPx}×{rightScreen.heightPx}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/12 bg-black aspect-video">
              <canvas
                ref={rightCanvasRef}
                width={640}
                height={360}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Barra simples de reprodução para vídeo */}
        {media?.kind === 'video' && (
          <div className="mt-3 flex items-center gap-3 border-t border-white/8 pt-3">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-[#0095FF] text-white hover:bg-[#0080DC]"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <span className="font-mono-tech w-12 text-xs text-zinc-300">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-[#0095FF]"
            />
            <span className="font-mono-tech w-12 text-right text-xs text-zinc-500">
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      {/* Alerta de bloqueio ou diagnóstico automático */}
      {blockError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/45 bg-red-500/12 p-3.5 text-sm text-red-200">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{blockError}</span>
        </div>
      )}

      {media && validation && validation.status !== 'REJECTED' && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
            validation.status === 'VALID'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-[#F5C41E]/35 bg-[#F5C41E]/10 text-[#FDE68A]'
          }`}
        >
          {validation.status === 'VALID' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C41E]" />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">
              {media.filename} · {media.width}×{media.height}
            </p>
            <p className="mt-0.5 opacity-90">{validation.messages.join(' ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
