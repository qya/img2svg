import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Download,
  Layers,
  Settings,
  X,
  Copy,
  Check,
  FileImage,
  ExternalLink,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import SVGIcon from './components/SVGIcon';
import { useImageTracer } from './hooks/useImageTracer';
import { useTheme } from './hooks/useTheme';
import { TraceOptions, defaultOptions, ExtensionSettings, defaultSettings } from './types';

// Local storage utility functions
const STORAGE_KEY = 'img2svg_settings';

const saveSettings = (settings: ExtensionSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

const getSettings = (): ExtensionSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultSettings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
};

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingFilename, setPendingFilename] = useState<string>('image');
  const [hasProcessedPending, setHasProcessedPending] = useState(false);
  const [options, setOptions] = useState<TraceOptions>(defaultOptions);
  const [settings, setSettings] = useState<ExtensionSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const {
    status,
    svgResult,
    previewUrl,
    sourceFile,
    progress,
    wasmLoaded,
    wasmError,
    processFile,
    processImageUrl,
    downloadSVG,
    copySVG,
    reset,
  } = useImageTracer();

  // Load settings from local storage on mount
  useEffect(() => {
    const storedSettings = getSettings();
    setSettings(storedSettings);
    setOptions(storedSettings.options);
    setTheme(storedSettings.theme);
  }, []);

  // Check for pending conversion from URL params
  useEffect(() => {
    const checkPending = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      
      if (mode === 'convert') {
        const imageUrl = urlParams.get('url');
        const filename = urlParams.get('filename') || 'image';
        
        if (imageUrl) {
          setPendingUrl(imageUrl);
          setPendingFilename(filename);
        }
      }
    };
    checkPending();
  }, []);

  // Process pending URL when WASM is loaded and initial check is done
  useEffect(() => {
    if (pendingUrl && wasmLoaded && status === 'idle' && !hasProcessedPending) {
      setHasProcessedPending(true);
      processImageUrl(pendingUrl, pendingFilename, options);
    }
  }, [pendingUrl, wasmLoaded, status, hasProcessedPending]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file, options);
    },
    [processFile, options]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file, options);
      e.target.value = '';
    },
    [processFile, options]
  );

  const handleCopy = useCallback(async () => {
    const success = await copySVG();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copySVG]);

  const handleReset = useCallback(() => {
    reset();
    setPendingUrl(null);
    setPendingFilename('image');
    setHasProcessedPending(false);
    // Clear URL params to prevent re-conversion on refresh
    if (window.location.search.includes('mode=convert')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [reset]);

  const saveCurrentSettings = () => {
    saveSettings(settings);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setOptions(defaultOptions);
    setTheme('system');
    saveSettings(defaultSettings);
  };

  const updateOptions = (updates: Partial<TraceOptions>) => {
    setOptions(prev => {
      const newOptions = { ...prev, ...updates };
      setSettings(prevSettings => ({
        ...prevSettings,
        options: newOptions
      }));
      return newOptions;
    });
  };

  const layerCount = svgResult
    ? (svgResult.match(/<path/g) || []).length
    : 0;

  // Show WASM error state
  if (wasmError) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-[var(--error-border)] bg-[var(--error-bg)] p-6">
          <div className="flex items-center gap-3 text-[var(--error-text)] mb-3">
            <AlertCircle className="w-7 h-7" />
            <h2 className="text-lg font-semibold">Trace engine unavailable</h2>
          </div>
          <p className="text-sm text-[var(--error-text)] mb-4 opacity-80">
            The WASM module failed to initialize. Reload this page to restart.
          </p>
          <p className="text-xs font-mono rounded-xl p-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
            {wasmError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-colors bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)]"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!wasmLoaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)]">Loading trace engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full border border-[var(--accent-subtle-border)] bg-[var(--accent-subtle)] flex items-center justify-center">
              <SVGIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Scalable Vector Graphics</p>
              <h1 className="text-2xl leading-none font-semibold">Convert Image to SVG</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-lg transition-colors ${theme === 'light' ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Light mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="Dark mode"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-lg transition-colors ${theme === 'system' ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                title="System theme"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>

            {status !== 'idle' && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <X className="w-4 h-4" />
                Start over
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Upload Area */}
          {status === 'idle' && (
            <div
              className={`rounded-3xl p-12 text-center transition-all border ${isDragging
                ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)]'
                }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-20 h-20 mx-auto mb-5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Upload className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Drop an image to trace</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Drag and drop, or click to browse PNG, JPG, GIF, WebP, and BMP files.
              </p>
              <div className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-1 text-xs bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                <FileImage className="w-4 h-4" />
                <span>Auto-resized to max 800px for fast tracing</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {status === 'loading' && (
            <div className="rounded-3xl p-12 border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-xl font-semibold mb-1">Tracing vector paths</p>
                  <p className="text-sm text-[var(--text-secondary)]">Processing {sourceFile}</p>
                </div>
                {progress > 0 && (
                  <div className="w-full max-w-xs">
                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] text-center mt-2">
                       {Math.round(progress)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="rounded-3xl p-8 border border-[var(--error-border)] bg-[var(--error-bg)]">
              <div className="flex items-center gap-3 text-[var(--error-text)] mb-3">
                <X className="w-6 h-6" />
                <h3 className="text-lg font-medium">Conversion failed</h3>
              </div>
              <p className="text-sm text-[var(--error-text)] mb-4 opacity-80">
                Unable to convert this image. Try a different file or adjust settings.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-sm border border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Open Settings
                </button>
              </div>
            </div>
          )}

          {/* Result Preview */}
          {status === 'done' && svgResult && (
            <div className="space-y-4">
              {/* Preview Card */}
              <div className="border border-[var(--border-subtle)] rounded-3xl overflow-hidden bg-[var(--bg-secondary)]">
                <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <SVGIcon className="w-4 h-4" />
                    Vector preview
                  </span>
                  {sourceFile && (
                    <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                      {sourceFile}
                    </span>
                  )}
                </div>
                <div className="p-6 bg-[var(--bg-primary)] min-h-[320px] flex items-center justify-center">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="SVG Preview"
                      className="max-w-full max-h-[400px] object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Stats */}
              {layerCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--success-bg)] border border-[var(--success-border)]">
                  <Layers className="w-5 h-5 text-[var(--success-text)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--success-text)]">
                      {layerCount} vector paths generated
                    </p>
                    <p className="text-xs text-[var(--success-text)] opacity-80">
                      Clean layers ready for export and editing
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={downloadSVG}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)] font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download SVG
                </button>
                <button
                  onClick={handleCopy}
                  className={`flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-colors border ${copied
                    ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]'
                    : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy SVG
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Tune trace settings
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Extension Section */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-subtle)]"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-[var(--bg-primary)] text-[var(--text-muted)] text-sm">
              Also you can install our Chrome extension
            </span>
          </div>
        </div>
        
        <div className="mt-8 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-subtle)] p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-semibold mb-2">Chrome Extension</h3>
              <p className="text-[var(--text-secondary)] mb-4">
                Convert images to SVG directly from your browser with our Chrome extension. Right-click any image on the web and convert it instantly.
              </p>
              <a
                href="https://github.com/qya/img2svg-extension"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Get Extension
              </a>
            </div>
            <div className="w-48 h-48 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center border border-[var(--border-subtle)]">
              <SVGIcon className="w-24 h-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <SVGIcon className="w-6 h-6" />
              <span className="text-sm text-[var(--text-muted)]">
                © {new Date().getFullYear()} Image2SVG
              </span>
            </div>
            
            <div className="flex flex-wrap gap-6">
              <a
                href="/license.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                License
              </a>
              <a
                href="/terms.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="https://github.com/qya/img2svg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-primary)]/80 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[var(--bg-primary)] rounded-3xl border border-[var(--border-subtle)] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-[var(--accent-subtle-border)] bg-[var(--accent-subtle)] flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Settings</p>
                  <h1 className="text-2xl leading-none font-semibold">Conversion Settings</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetSettings}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm">Reset</span>
                </button>
                <button
                  onClick={saveCurrentSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)] transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Save Settings
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - General Settings */}
                <div className="space-y-6">
                  {/* General Settings Card */}
                  <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full border border-[var(--accent-subtle-border)] bg-[var(--accent-subtle)] flex items-center justify-center">
                        <SVGIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold">Workflow defaults</h2>
                        <p className="text-xs text-[var(--text-muted)]">How the application behaves</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Auto Download Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-3">
                          <Download className="w-4 h-4 text-[var(--text-muted)]" />
                          <div>
                            <p className="text-sm font-medium">Auto Download</p>
                            <p className="text-xs text-[var(--text-muted)]">Download SVG immediately after conversion</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.autoDownload}
                            onChange={(e) => setSettings(prev => ({ ...prev, autoDownload: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--text-on-accent)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-on-accent)] after:border-[var(--border-subtle)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                        </label>
                      </div>

                      {/* Theme Selection */}
                      <div className="p-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Sun className="w-4 h-4 text-[var(--text-muted)]" />
                            <div>
                              <p className="text-sm font-medium">Appearance</p>
                              <p className="text-xs text-[var(--text-muted)]">System auto-detects browser setting</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                          {(['light', 'dark', 'system'] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => {
                                setSettings(prev => ({ ...prev, theme: t }));
                                setTheme(t);
                              }}
                              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs capitalize transition-all ${settings.theme === t
                                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-sm font-medium'
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                }`}
                            >
                              {t === 'light' && <Sun className="w-3.5 h-3.5" />}
                              {t === 'dark' && <Moon className="w-3.5 h-3.5" />}
                              {t === 'system' && <Monitor className="w-3.5 h-3.5" />}
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Trace Settings */}
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-center justify-center">
                      <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Trace profile</h2>
                      <p className="text-xs text-[var(--text-muted)]">Applied when converting images</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Clustering */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[var(--text-muted)]" />
                          <label className="text-sm font-medium">Clustering</label>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">
                          {settings.options.binary ? 'Black & White' : 'Full Color'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => updateOptions({ binary: true })}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${settings.options.binary
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                              : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                          B/W
                        </button>
                        <button
                          onClick={() => updateOptions({ binary: false })}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${!settings.options.binary
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                              : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                          Color
                        </button>
                      </div>
                    </div>

                    {/* Layer Style */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Layer Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => updateOptions({ hierarchical: 'stacked' })}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${settings.options.hierarchical === 'stacked'
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                              : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                          Stacked
                        </button>
                        <button
                          onClick={() => updateOptions({ hierarchical: 'cutout' })}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${settings.options.hierarchical === 'cutout'
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                              : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                          Cutout
                        </button>
                      </div>
                    </div>

                    {/* Curve Fitting */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Curve Fitting</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['pixel', 'polygon', 'spline'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => updateOptions({ mode })}
                            className={`px-3 py-2.5 rounded-xl text-sm font-medium border capitalize transition-colors ${settings.options.mode === mode
                                ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                                : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                              }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[var(--border-subtle)] pt-4">
                      <label className="text-sm font-medium mb-4 block">Advanced controls</label>

                      <div className="space-y-4">
                        {/* Filter Speckle */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--text-muted)]">Filter Speckle</span>
                            <span className="text-xs font-mono text-[var(--text-secondary)]">{settings.options.filterSpeckle}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={64}
                            step={1}
                            value={settings.options.filterSpeckle}
                            onChange={(e) => updateOptions({ filterSpeckle: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        {/* Color Precision */}
                        {!settings.options.binary && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[var(--text-muted)]">Color Precision</span>
                              <span className="text-xs font-mono text-[var(--text-secondary)]">{settings.options.colorPrecision}</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={8}
                              step={1}
                              value={settings.options.colorPrecision}
                              onChange={(e) => updateOptions({ colorPrecision: parseInt(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        )}

                        {/* Layer Difference */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--text-muted)]">Gradient Step</span>
                            <span className="text-xs font-mono text-[var(--text-secondary)]">{settings.options.layerDifference}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={255}
                            step={1}
                            value={settings.options.layerDifference}
                            onChange={(e) => updateOptions({ layerDifference: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        {/* Corner Threshold */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--text-muted)]">Corner Threshold</span>
                            <span className="text-xs font-mono text-[var(--text-secondary)]">{settings.options.cornerThreshold}°</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={180}
                            step={1}
                            value={settings.options.cornerThreshold}
                            onChange={(e) => updateOptions({ cornerThreshold: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        {/* Segment Length */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--text-muted)]">Segment Length</span>
                            <span className="text-xs font-mono text-[var(--text-secondary)]">{settings.options.lengthThreshold}</span>
                          </div>
                          <input
                            type="range"
                            min={3.5}
                            max={10}
                            step={0.5}
                            value={settings.options.lengthThreshold}
                            onChange={(e) => updateOptions({ lengthThreshold: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
