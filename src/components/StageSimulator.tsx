import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Grid,
  Monitor,
  Pause,
  Play,
  Repeat,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { StageScreen } from '../types/portal';
import { formatDuration, validateMediaForHolyrics } from '../utils/holyrics';

interface StageSimulatorProps {
  screens: StageScreen[];
  initialUrl?: string;
  initialFilename?: string;
  initialCategory?: 'VIDEO' | 'IMAGE' | 'AUDIO' | 'DOCUMENT';
}

type FitMode = 'contain' | 'cover' | 'blur';
type StageMode = 'mirror' | 'split';
type MobileFocus = 'ALL' | 'CENTER' | 'SIDES';

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
  fitMode: FitMode,
  showSafeZone: boolean,
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

  // Stage dark backdrop
  ctx.fillStyle = '#07080B';
  ctx.fillRect(0, 0, cw, ch);

  if (source && sourceW > 0 && sourceH > 0) {
    const srcRatio = sourceW / sourceH;
    const dstRatio = cw / ch;

    if (fitMode === 'blur') {
      // Blurred fill background like Holyrics border-blur
      ctx.save();
      ctx.filter = 'blur(22px) brightness(0.45)';
      let bw = cw;
      let bh = ch;
      if (srcRatio > dstRatio) {
        bw = ch * srcRatio;
      } else {
        bh = cw / srcRatio;
      }
      ctx.drawImage(source, (cw - bw) / 2, (ch - bh) / 2, bw, bh);
      ctx.restore();

      // Sharp centered foreground
      let fw = cw;
      let fh = ch;
      if (srcRatio > dstRatio) {
        fh = cw / srcRatio;
      } else {
        fw = ch * srcRatio;
      }
      ctx.drawImage(source, (cw - fw) / 2, (ch - fh) / 2, fw, fh);
    } else if (fitMode === 'cover') {
      let dw = cw;
      let dh = ch;
      if (srcRatio > dstRatio) {
        dw = ch * srcRatio;
      } else {
        dh = cw / srcRatio;
      }
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    } else {
      // contain
      let dw = cw;
      let dh = ch;
      if (srcRatio > dstRatio) {
        dh = cw / srcRatio;
      } else {
        dw = ch * srcRatio;
      }
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
  } else {
    // Test signal bars when no media loaded
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, '#0D1321');
    grad.addColorStop(1, '#10243E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = 'rgba(0, 149, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, cw - 36, ch - 36);

    ctx.fillStyle = '#F5F6F8';
    ctx.font = '600 22px "Instrument Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(screenLabel, cw / 2, ch / 2 - 8);

    ctx.fillStyle = '#38BDF8';
    ctx.font = '500 16px "DM Mono", monospace';
    ctx.fillText(`${screenResolution} · 16:9`, cw / 2, ch / 2 + 22);
  }

  // Optional Holyrics lyrics overlay test
  if (showLyricsOverlay) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(0, ch * 0.62, cw, ch * 0.3);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.font = '700 26px "Instrument Sans", sans-serif';
    ctx.fillText('Pai, eu amo Tua presença', cw / 2, ch * 0.75);
    ctx.fillText('Teu sorriso é vida em mim', cw / 2, ch * 0.84);
    ctx.restore();
  }

  // Optional broadcast Safe Zone guides (5% action safe, 10% title safe)
  if (showSafeZone) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(245, 196, 30, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cw * 0.05, ch * 0.05, cw * 0.9, ch * 0.9);
    ctx.strokeStyle = 'rgba(0, 149, 255, 0.85)';
    ctx.strokeRect(cw * 0.1, ch * 0.1, cw * 0.8, ch * 0.8);
    ctx.restore();
  }
}

export function StageSimulator({
  screens,
  initialUrl,
  initialFilename,
}: StageSimulatorProps) {
  const [primaryMedia, setPrimaryMedia] = useState<LoadedPreviewMedia | null>(null);
  const [sideMedia, setSideMedia] = useState<LoadedPreviewMedia | null>(null);

  const [stageMode, setStageMode] = useState<StageMode>('mirror');
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);
  const [mobileFocus, setMobileFocus] = useState<MobileFocus>('ALL');

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoop, setIsLoop] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const primaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const primaryImgRef = useRef<HTMLImageElement | null>(null);
  const sideVideoRef = useRef<HTMLVideoElement | null>(null);
  const sideImgRef = useRef<HTMLImageElement | null>(null);

  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const centerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const leftScreen = screens.find((s) => s.code === 'LEFT') ?? screens[0];
  const centerScreen = screens.find((s) => s.code === 'CENTER') ?? screens[1];
  const rightScreen = screens.find((s) => s.code === 'RIGHT') ?? screens[2];

  const loadLocalFile = useCallback(async (file: File, target: 'primary' | 'side') => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'].includes(ext);
    const isImage = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'].includes(ext);
    if (!isVideo && !isImage) return;

    const url = URL.createObjectURL(file);

    if (isImage) {
      const img = new Image();
      img.onload = () => {
        const loaded: LoadedPreviewMedia = {
          url,
          filename: file.name,
          kind: 'image',
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSizeBytes: file.size,
        };
        if (target === 'primary') {
          primaryImgRef.current = img;
          setPrimaryMedia(loaded);
          setIsPlaying(false);
          setDuration(0);
          setCurrentTime(0);
        } else {
          sideImgRef.current = img;
          setSideMedia(loaded);
        }
      };
      img.src = url;
      return;
    }

    const vid = document.createElement('video');
    vid.preload = 'auto';
    vid.muted = true;
    vid.playsInline = true;
    vid.onloadedmetadata = () => {
      const loaded: LoadedPreviewMedia = {
        url,
        filename: file.name,
        kind: 'video',
        width: vid.videoWidth,
        height: vid.videoHeight,
        duration: Number.isFinite(vid.duration) ? vid.duration : 0,
        fileSizeBytes: file.size,
      };
      if (target === 'primary') {
        setPrimaryMedia(loaded);
        setDuration(loaded.duration ?? 0);
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        setSideMedia(loaded);
      }
    };
    vid.src = url;
  }, []);

  // Load initial media passed from Programming block if any
  useEffect(() => {
    if (!initialUrl || !initialFilename) return;
    const ext = initialFilename.slice(initialFilename.lastIndexOf('.')).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'].includes(ext);
    if (isVideo) {
      const vid = document.createElement('video');
      vid.onloadedmetadata = () => {
        setPrimaryMedia({
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
        primaryImgRef.current = img;
        setPrimaryMedia({
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

  // Generate instant synthetic 16:9 or 9:16 sample for testing without external file
  const loadSampleTestPattern = (ratio: '16:9' | '9:16') => {
    const offscreen = document.createElement('canvas');
    offscreen.width = ratio === '16:9' ? 1920 : 1080;
    offscreen.height = ratio === '16:9' ? 1080 : 1920;
    const octx = offscreen.getContext('2d');
    if (!octx) return;

    const grad = octx.createLinearGradient(0, 0, offscreen.width, offscreen.height);
    grad.addColorStop(0, '#091428');
    grad.addColorStop(0.55, '#0055A4');
    grad.addColorStop(1, '#090B10');
    octx.fillStyle = grad;
    octx.fillRect(0, 0, offscreen.width, offscreen.height);

    octx.strokeStyle = '#F5C41E';
    octx.lineWidth = 10;
    octx.strokeRect(36, 36, offscreen.width - 72, offscreen.height - 72);

    octx.fillStyle = '#FFFFFF';
    octx.textAlign = 'center';
    octx.font = '700 84px sans-serif';
    octx.fillText('NOVA JOVENS 2', offscreen.width / 2, offscreen.height / 2 - 30);

    octx.fillStyle = '#F5C41E';
    octx.font = '600 42px monospace';
    octx.fillText(
      `TESTE ${ratio} (${offscreen.width}x${offscreen.height})`,
      offscreen.width / 2,
      offscreen.height / 2 + 48,
    );

    const dataUrl = offscreen.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      primaryImgRef.current = img;
      setPrimaryMedia({
        url: dataUrl,
        filename: ratio === '16:9' ? 'teste_palco_16x9.png' : 'teste_vertical_9x16.png',
        kind: 'image',
        width: offscreen.width,
        height: offscreen.height,
        fileSizeBytes: 640_000,
      });
      setIsPlaying(false);
    };
    img.src = dataUrl;
  };

  // Sync play/pause/loop/mute on hidden primary & side videos
  useEffect(() => {
    const pv = primaryVideoRef.current;
    const sv = sideVideoRef.current;
    if (pv) {
      pv.loop = isLoop;
      pv.muted = isMuted;
      if (isPlaying) {
        pv.play().catch(() => setIsPlaying(false));
      } else {
        pv.pause();
      }
    }
    if (sv) {
      sv.loop = isLoop;
      sv.muted = true;
      if (isPlaying) {
        sv.play().catch(() => undefined);
      } else {
        sv.pause();
      }
    }
  }, [isPlaying, isLoop, isMuted, primaryMedia, sideMedia]);

  // Real-time synchronized render loop onto all 3 screens
  useEffect(() => {
    let rafId = 0;

    const render = () => {
      const pv = primaryVideoRef.current;
      const sv = sideVideoRef.current;

      const centerSource =
        primaryMedia?.kind === 'video'
          ? pv
          : primaryMedia?.kind === 'image'
            ? primaryImgRef.current
            : null;
      const centerW = primaryMedia?.width ?? 0;
      const centerH = primaryMedia?.height ?? 0;

      const useSplitSide = stageMode === 'split' && sideMedia !== null;
      const sideSource = useSplitSide
        ? sideMedia.kind === 'video'
          ? sv
          : sideImgRef.current
        : centerSource;
      const sideW = useSplitSide ? sideMedia.width : centerW;
      const sideH = useSplitSide ? sideMedia.height : centerH;

      drawFrameToCanvas(
        leftCanvasRef.current,
        sideSource,
        sideW,
        sideH,
        fitMode,
        showSafeZone,
        showLyricsOverlay,
        leftScreen.label,
        `${leftScreen.widthPx}×${leftScreen.heightPx}`,
      );

      drawFrameToCanvas(
        centerCanvasRef.current,
        centerSource,
        centerW,
        centerH,
        fitMode,
        showSafeZone,
        showLyricsOverlay,
        centerScreen.label,
        `${centerScreen.widthPx}×${centerScreen.heightPx}`,
      );

      drawFrameToCanvas(
        rightCanvasRef.current,
        sideSource,
        sideW,
        sideH,
        fitMode,
        showSafeZone,
        showLyricsOverlay,
        rightScreen.label,
        `${rightScreen.widthPx}×${rightScreen.heightPx}`,
      );

      if (pv && primaryMedia?.kind === 'video') {
        setCurrentTime(pv.currentTime || 0);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [
    primaryMedia,
    sideMedia,
    stageMode,
    fitMode,
    showSafeZone,
    showLyricsOverlay,
    leftScreen,
    centerScreen,
    rightScreen,
  ]);

  const handleSeek = (nextTime: number) => {
    setCurrentTime(nextTime);
    if (primaryVideoRef.current) primaryVideoRef.current.currentTime = nextTime;
    if (sideVideoRef.current) sideVideoRef.current.currentTime = nextTime;
  };

  const validation = primaryMedia
    ? validateMediaForHolyrics({
        filename: primaryMedia.filename,
        fileSizeBytes: primaryMedia.fileSizeBytes || 10_000_000,
        widthPx: primaryMedia.width,
        heightPx: primaryMedia.height,
        screens,
      })
    : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-[#12151C]">
      {/* Hidden source video elements for synchronized canvas mirroring */}
      {primaryMedia?.kind === 'video' && (
        <video
          ref={primaryVideoRef}
          src={primaryMedia.url}
          className="hidden"
          playsInline
          onEnded={() => {
            if (!isLoop) setIsPlaying(false);
          }}
        />
      )}
      {sideMedia?.kind === 'video' && (
        <video ref={sideVideoRef} src={sideMedia.url} className="hidden" playsInline muted />
      )}

      {/* Header & Upload actions */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-[#0095FF]" />
            <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Simulador de Palco — 3 Telões 16:9
            </h3>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Reproduza sua mídia sincronizada na Lateral Esquerda ({leftScreen.widthPx}×{leftScreen.heightPx}),
            Telão Central ({centerScreen.widthPx}×{centerScreen.heightPx}) e Lateral Direita ({rightScreen.widthPx}×{rightScreen.heightPx}).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0080DC]">
            <Upload className="h-4 w-4" />
            <span>Testar Mídia Principal</span>
            <input
              type="file"
              accept="video/*,image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadLocalFile(f, 'primary');
              }}
            />
          </label>

          {stageMode === 'split' && (
            <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-white/15 dark:bg-[#191D26] dark:text-white dark:hover:bg-[#222733]">
              <Upload className="h-4 w-4" />
              <span>Mídia das Laterais</span>
              <input
                type="file"
                accept="video/*,image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void loadLocalFile(f, 'side');
                }}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => loadSampleTestPattern('16:9')}
            className="min-h-[44px] rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Gerar Teste 16:9
          </button>
          <button
            type="button"
            onClick={() => loadSampleTestPattern('9:16')}
            className="min-h-[44px] rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Simular Erro 9:16
          </button>
        </div>
      </div>

      {/* Mobile screen focus selector */}
      <div className="mt-4 flex gap-1.5 md:hidden">
        {(['ALL', 'CENTER', 'SIDES'] as MobileFocus[]).map((focus) => (
          <button
            key={focus}
            type="button"
            onClick={() => setMobileFocus(focus)}
            className={`min-h-[44px] flex-1 rounded-lg border text-xs font-semibold ${
              mobileFocus === focus
                ? 'border-[#0095FF] bg-[#0095FF]/15 text-[#0095FF]'
                : 'border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-zinc-400'
            }`}
          >
            {focus === 'ALL' ? 'As 3 Telas' : focus === 'CENTER' ? 'Central 4K' : 'Laterais 3K'}
          </button>
        ))}
      </div>

      {/* Stage 3-Screen Viewport */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-[#06070A] p-3 sm:p-5">
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-end md:gap-4">
          {/* Lateral Esquerda */}
          <div
            className={`w-full md:flex-1 ${
              mobileFocus === 'CENTER' ? 'hidden md:block' : 'block'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium text-zinc-200">{leftScreen.label}</span>
              <span className="font-mono-tech">
                {leftScreen.widthPx}×{leftScreen.heightPx}
              </span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/15 bg-black">
              <canvas
                ref={leftCanvasRef}
                width={640}
                height={360}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* Telão Central */}
          <div
            className={`w-full md:flex-[1.22] ${
              mobileFocus === 'SIDES' ? 'hidden md:block' : 'block'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-[#38BDF8]">{centerScreen.label}</span>
              <span className="font-mono-tech text-[#F5C41E]">
                {centerScreen.widthPx}×{centerScreen.heightPx}
              </span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg border-2 border-[#0095FF]/60 bg-black shadow-lg">
              <canvas
                ref={centerCanvasRef}
                width={768}
                height={432}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* Lateral Direita */}
          <div
            className={`w-full md:flex-1 ${
              mobileFocus === 'CENTER' ? 'hidden md:block' : 'block'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium text-zinc-200">{rightScreen.label}</span>
              <span className="font-mono-tech">
                {rightScreen.widthPx}×{rightScreen.heightPx}
              </span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/15 bg-black">
              <canvas
                ref={rightCanvasRef}
                width={640}
                height={360}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Synchronized Playback Controls */}
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={primaryMedia?.kind !== 'video'}
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0095FF] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Pausar 3 Telas' : 'Play nas 3 Telas'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLoop((l) => !l)}
              aria-label="Alternar repetição"
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-3 text-sm ${
                isLoop
                  ? 'border-[#0095FF]/50 bg-[#0095FF]/15 text-[#38BDF8]'
                  : 'border-white/15 text-zinc-400'
              }`}
            >
              <Repeat className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Ativar áudio' : 'Silenciar áudio'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/10"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {primaryMedia?.kind === 'video' && (
            <div className="flex flex-1 items-center gap-3 sm:max-w-sm">
              <span className="font-mono-tech text-xs text-zinc-400">
                {formatDuration(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                aria-label="Linha do tempo do vídeo"
                className="h-2 w-full accent-[#0095FF]"
              />
              <span className="font-mono-tech text-xs text-zinc-400">
                {formatDuration(duration)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Simulator Mode Toggles */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-white/10 dark:bg-[#171B24]">
          <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Modo de Exibição
          </span>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setStageMode('mirror')}
              className={`min-h-[40px] rounded-lg px-2 text-xs font-semibold ${
                stageMode === 'mirror'
                  ? 'bg-[#0095FF] text-white'
                  : 'bg-zinc-100 text-zinc-700 dark:bg-white/5 dark:text-zinc-300'
              }`}
            >
              Espelhado (3x)
            </button>
            <button
              type="button"
              onClick={() => setStageMode('split')}
              className={`min-h-[40px] rounded-lg px-2 text-xs font-semibold ${
                stageMode === 'split'
                  ? 'bg-[#0095FF] text-white'
                  : 'bg-zinc-100 text-zinc-700 dark:bg-white/5 dark:text-zinc-300'
              }`}
            >
              Central + Laterais
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 p-3 dark:border-white/10 dark:bg-[#171B24]">
          <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Enquadramento Holyrics
          </span>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {(['contain', 'cover', 'blur'] as FitMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFitMode(mode)}
                className={`min-h-[40px] rounded-lg px-1.5 text-xs font-semibold ${
                  fitMode === mode
                    ? 'bg-[#0095FF] text-white'
                    : 'bg-zinc-100 text-zinc-700 dark:bg-white/5 dark:text-zinc-300'
                }`}
              >
                {mode === 'contain' ? 'Conter' : mode === 'cover' ? 'Preencher' : 'Blur'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLyricsOverlay((v) => !v)}
          className={`flex min-h-[44px] items-center justify-between rounded-xl border p-3 text-left transition-colors ${
            showLyricsOverlay
              ? 'border-[#0095FF] bg-[#0095FF]/10 text-[#0095FF]'
              : 'border-zinc-200 text-zinc-700 dark:border-white/10 dark:bg-[#171B24] dark:text-zinc-200'
          }`}
        >
          <div>
            <span className="block text-xs opacity-80">Contraste</span>
            <span className="text-sm font-semibold">Simular Letra Holyrics</span>
          </div>
          <Eye className="h-5 w-5 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setShowSafeZone((v) => !v)}
          className={`flex min-h-[44px] items-center justify-between rounded-xl border p-3 text-left transition-colors ${
            showSafeZone
              ? 'border-[#F5C41E] bg-[#F5C41E]/10 text-[#F5C41E]'
              : 'border-zinc-200 text-zinc-700 dark:border-white/10 dark:bg-[#171B24] dark:text-zinc-200'
          }`}
        >
          <div>
            <span className="block text-xs opacity-80">Margens de LED</span>
            <span className="text-sm font-semibold">Grade Safe Zone</span>
          </div>
          <Grid className="h-5 w-5 shrink-0" />
        </button>
      </div>

      {/* Automatic Technical Diagnostic */}
      {primaryMedia && validation && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            validation.status === 'VALID'
              ? 'border-emerald-500/35 bg-emerald-500/10'
              : 'border-[#F5C41E]/40 bg-[#F5C41E]/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {validation.status === 'VALID' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-[#F5C41E]" />
              )}
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Diagnóstico: {primaryMedia.filename}
              </span>
            </div>
            <span className="font-mono-tech text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {primaryMedia.width}×{primaryMedia.height} · {validation.aspectRatio ?? '—'}
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {validation.messages.map((msg, idx) => (
              <li key={idx}>• {msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
