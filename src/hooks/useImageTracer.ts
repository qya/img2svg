import { useState, useRef, useCallback, useEffect } from 'react';
import { TraceOptions } from '../types';
import initWasm, { BinaryImageConverter, ColorImageConverter } from '../vendor/vtracer/vtracer_webapp';

export type TraceStatus = 'idle' | 'loading' | 'done' | 'error';

interface ImageDataRef {
  data: ImageData;
  width: number;
  height: number;
}

export function useImageTracer() {
  const [status, setStatus] = useState<TraceStatus>('idle');
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);

  const imageDataRef = useRef<ImageDataRef | null>(null);
  const abortRef = useRef(false);

  // Initialize WASM
  useEffect(() => {
    const loadWasm = async () => {
      try {
        // For single app, use relative path to the vendor directory
        const wasmUrl = new URL('../vendor/vtracer/vtracer_webapp_bg.wasm', import.meta.url).href;

        console.log('Loading WASM from:', wasmUrl);

        // Fetch the WASM file
        const response = await fetch(wasmUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
        }

        const wasmArrayBuffer = await response.arrayBuffer();
        console.log('WASM file fetched, size:', wasmArrayBuffer.byteLength);

        // Initialize with proper format for vtracer
        await initWasm({ module_or_path: wasmArrayBuffer });

        console.log('WASM initialized successfully');
        setWasmLoaded(true);
        setWasmError(null);
      } catch (err) {
        console.error('Failed to load WASM:', err);
        setWasmError(err instanceof Error ? err.message : 'Unknown error');
        setWasmLoaded(false);
      }
    };

    loadWasm();
  }, []);

  const trace = useCallback(async (
    imageData: ImageData,
    width: number,
    height: number,
    options: TraceOptions
  ) => {
    setStatus('loading');
    setProgress(0);
    abortRef.current = false;

    // Small delay to let UI update
    await new Promise(r => setTimeout(r, 50));

    try {
      const canvasId = `vtracer-canvas-${Date.now()}`;
      const svgId = `vtracer-svg-${Date.now()}`;

      const hiddenCanvas = document.createElement('canvas');
      hiddenCanvas.id = canvasId;
      hiddenCanvas.width = width;
      hiddenCanvas.height = height;
      hiddenCanvas.style.display = 'none';

      const hiddenSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      hiddenSvg.id = svgId;
      hiddenSvg.style.display = 'none';
      hiddenSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      hiddenSvg.setAttribute('width', String(width));
      hiddenSvg.setAttribute('height', String(height));
      hiddenSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      document.body.appendChild(hiddenCanvas);
      document.body.appendChild(hiddenSvg);

      const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true })!;
      ctx.putImageData(imageData, 0, 0);

      const deg2rad = (deg: number) => (deg / 180) * Math.PI;

      const converterParams = JSON.stringify({
        canvas_id: canvasId,
        svg_id: svgId,
        mode: options.mode,
        clustering_mode: options.binary ? 'binary' : 'color',
        hierarchical: options.hierarchical,
        corner_threshold: deg2rad(options.cornerThreshold),
        length_threshold: options.lengthThreshold,
        max_iterations: options.maxIterations,
        splice_threshold: deg2rad(options.spliceThreshold),
        filter_speckle: options.filterSpeckle * options.filterSpeckle,
        color_precision: 8 - options.colorPrecision,
        layer_difference: options.layerDifference,
        path_precision: options.pathPrecision,
      });

      const converter = options.binary
        ? BinaryImageConverter.new_with_string(converterParams)
        : ColorImageConverter.new_with_string(converterParams);

      converter.init();

      let done = false;
      let lastProgress = 0;

      while (!done && !abortRef.current) {
        done = converter.tick();
        const currentProgress = converter.progress();
        if (currentProgress !== lastProgress) {
          setProgress(currentProgress);
          lastProgress = currentProgress;
        }

        // Yield to UI thread
        if (!done) {
          await new Promise(r => requestAnimationFrame(r));
        }
      }

      if (abortRef.current) {
        converter.free();
        document.body.removeChild(hiddenCanvas);
        document.body.removeChild(hiddenSvg);
        setStatus('idle');
        return;
      }

      const svgStr = hiddenSvg.outerHTML;
      converter.free();
      document.body.removeChild(hiddenCanvas);
      document.body.removeChild(hiddenSvg);

      setSvgResult(svgStr);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      setPreviewUrl(URL.createObjectURL(blob));
      setStatus('done');
    } catch (err) {
      console.error('Trace error:', err);
      setStatus('error');
    }
  }, []);

  const processFile = useCallback(async (
    file: File,
    options: TraceOptions,
    maxSize: number = 800
  ) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }

    setStatus('loading');
    setSvgResult(null);
    setPreviewUrl(null);
    setSourceFile(file.name);

    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;

          if (w > maxSize || h > maxSize) {
            if (w > h) {
              h = Math.round((h / w) * maxSize);
              w = maxSize;
            } else {
              w = Math.round((w / h) * maxSize);
              h = maxSize;
            }
          }

          const offscreen = document.createElement('canvas');
          offscreen.width = w;
          offscreen.height = h;
          const ctx = offscreen.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          imageDataRef.current = { data: imageData, width: w, height: h };

          trace(imageData, w, h, options);
          resolve();
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, [trace]);

  const processImageUrl = useCallback(async (
    url: string,
    filename: string,
    options: TraceOptions,
    maxSize: number = 800
  ) => {
    setStatus('loading');
    setSvgResult(null);
    setPreviewUrl(null);
    setSourceFile(filename);

    let objectUrl: string | null = null;
    try {
      // Fetch the image from URL (may fail due to CORS restrictions)
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image element'));
        img.src = objectUrl!;
      });

      let w = img.width;
      let h = img.height;

      if (w > maxSize || h > maxSize) {
        if (w > h) {
          h = Math.round((h / w) * maxSize);
          w = maxSize;
        } else {
          w = Math.round((w / h) * maxSize);
          h = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      imageDataRef.current = { data: imageData, width: w, height: h };

      await trace(imageData, w, h, options);
    } catch (err) {
      console.error('Error processing image URL:', err);
      setStatus('error');
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }, [trace]);

  const retrace = useCallback((options: TraceOptions) => {
    if (imageDataRef.current) {
      const { data, width, height } = imageDataRef.current;
      trace(data, width, height, options);
    }
  }, [trace]);

  const downloadSVG = useCallback(() => {
    if (!svgResult || !sourceFile) return;

    const blob = new Blob([svgResult], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = sourceFile.replace(/\.[^/.]+$/, '') + '.svg';
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }, [svgResult, sourceFile]);

  const copySVG = useCallback(async () => {
    if (!svgResult) return false;
    try {
      await navigator.clipboard.writeText(svgResult);
      return true;
    } catch {
      return false;
    }
  }, [svgResult]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus('idle');
    setSvgResult(null);
    setPreviewUrl(null);
    setSourceFile(null);
    setProgress(0);
    imageDataRef.current = null;
  }, []);

  return {
    status,
    svgResult,
    previewUrl,
    sourceFile,
    progress,
    wasmLoaded,
    wasmError,
    processFile,
    processImageUrl,
    retrace,
    downloadSVG,
    copySVG,
    reset,
  };
}
