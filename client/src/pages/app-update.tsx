import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiRequestFormData, apiRequestStream } from "@/lib/queryClient";
import {
  hydrateRunLog,
  mergeStepEvent,
  type SettledRunStatus,
  type UpdateLogPersistedEvent,
  type UpdateLogSSEEvent,
} from "@shared/update-log";
import {
  Upload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Package,
  ArrowDownCircle,
  RotateCcw,
  Loader2,
  FileArchive,
  Shield,
  History,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface UpdateStatus {
  currentVersion: string;
  backup: {
    exists: boolean;
    timestamp?: string;
    version?: string;
  };
}

interface PreviewWarning {
  level: "warning" | "blocker";
  message: string;
}

interface UploadPreview {
  fileCount: number;
  dirCount: number;
  totalSize: number;
  topLevel: string[];
  hasServer: boolean;
  hasClient: boolean;
  hasPackageJson: boolean;
  warnings: PreviewWarning[];
  hasBlockers: boolean;
}

interface UploadResult {
  success: boolean;
  newVersion: string;
  currentVersion: string;
  preview?: UploadPreview;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

type SSEEvent = UpdateLogSSEEvent;

interface UpdateRun {
  id: string;
  triggeredBy: string | null;
  triggeredByUsername: string | null;
  fromVersion: string | null;
  toVersion: string | null;
  status: "running" | "success" | "failed" | "rolled_back" | "interrupted";
  finalMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface UpdateRunEvent {
  id: number;
  runId: string;
  step: string;
  status: string;
  message: string;
  progress: number | null;
  createdAt: string;
}

interface LatestRunResponse {
  run: UpdateRun | null;
  events: UpdateRunEvent[];
}

interface RunsListResponse {
  runs: UpdateRun[];
}

export default function AppUpdate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [updating, setUpdating] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  // Live SSE buffer; settled views re-derive from the persisted run.
  const [liveLogs, setLiveLogs] = useState<SSEEvent[]>([]);
  const [historicalRun, setHistoricalRun] =
    useState<LatestRunResponse | null>(null);
  // Gates the live -> settled handoff while latestRun is still stale.
  const [lastLiveRunId, setLastLiveRunId] = useState<string | null>(null);
  const [updateComplete, setUpdateComplete] = useState(false);
  const [historicalRunId, setHistoricalRunId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: status, isLoading } = useQuery<UpdateStatus>({
    queryKey: ["/api/app-update/status"],
    refetchInterval: false,
  });

  const { data: latestRun, refetch: refetchLatest } = useQuery<LatestRunResponse>({
    queryKey: ["/api/app-update/runs/latest"],
    refetchInterval: false,
  });

  const { data: runsList, refetch: refetchRuns } = useQuery<RunsListResponse>({
    queryKey: ["/api/app-update/runs"],
    refetchInterval: false,
  });

  const settledRun = useMemo<LatestRunResponse | null>(() => {
    if (historicalRun?.run) return historicalRun;
    if (latestRun?.run) return latestRun;
    return null;
  }, [historicalRun, latestRun]);

  const displayLogs = useMemo<SSEEvent[]>(() => {
    if (updating) return liveLogs;
    if (lastLiveRunId && settledRun?.run?.id !== lastLiveRunId) {
      return liveLogs;
    }
    if (!settledRun?.run || !settledRun.events?.length) return liveLogs;
    const events = settledRun.events as UpdateLogPersistedEvent[];
    return hydrateRunLog(events, settledRun.run.status as SettledRunStatus);
  }, [updating, liveLogs, settledRun, lastLiveRunId]);

  useEffect(() => {
    if (updating) return;
    if (!settledRun?.run) return;
    if (lastLiveRunId && settledRun.run.id !== lastLiveRunId) return;
    if (settledRun.run.id !== historicalRunId) {
      setHistoricalRunId(settledRun.run.id);
    }
    setUpdateComplete(settledRun.run.status === "success");
  }, [updating, settledRun, historicalRunId, lastLiveRunId]);

  const scrollToBottom = useCallback(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll the terminal to the bottom whenever the rendered log
  // changes — covers both live SSE appends and post-refresh hydration so
  // the final "Update completed successfully" line is always visible
  // without manual scrolling.
  useEffect(() => {
    scrollToBottom();
  }, [displayLogs, scrollToBottom]);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast({ title: "Invalid file", description: "Please upload a .zip file", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadResult(null);
    setLiveLogs([]);
    setHistoricalRun(null);
    setLastLiveRunId(null);
    setHistoricalRunId(null);
    setUpdateComplete(false);

    try {
      const formData = new FormData();
      formData.append("zipFile", file);

      let res: Response;
      try {
        res = await apiRequestFormData("POST", "/api/app-update/upload", formData);
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        return;
      }

      const data = await res.json();

      setUploadResult(data);
      toast({ title: "Upload successful", description: `Version ${data.newVersion} ready to install` });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeUpdate = async () => {
    if (!confirm("Are you sure you want to apply this update? A backup will be created, but please ensure you have verified the update package.")) {
      return;
    }

    setUpdating(true);
    setLiveLogs([]);
    setHistoricalRun(null);
    setLastLiveRunId(null);
    setUpdateComplete(false);
    setHistoricalRunId(null);

    try {
      let res: Response;
      try {
        res = await apiRequestStream("POST", "/api/app-update/execute");
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Update request failed", variant: "destructive" });
        setUpdating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        toast({ title: "Error", description: "Failed to start update stream", variant: "destructive" });
        setUpdating(false);
        return;
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              setLiveLogs((prev) => mergeStepEvent(prev, event));
              setTimeout(scrollToBottom, 50);

              if (event.status === "error") {
                toast({ title: "Update failed", description: event.message, variant: "destructive" });
                // Refresh status so the Backup Status card (and the
                // Rollback to Previous button) reflect the newly-created
                // backup right away — without requiring a manual page
                // reload — when a step like the database migration fails.
                queryClient.invalidateQueries({ queryKey: ["/api/app-update/status"] });
              }

              if (event.step === "complete" && event.status === "done") {
                setUpdateComplete(true);
                setUploadResult(null);
                queryClient.invalidateQueries({ queryKey: ["/api/app-update/status"] });
                toast({ title: "Update complete", description: "Application updated successfully" });
              }
              if (event.runId) {
                setHistoricalRunId(event.runId);
                setLastLiveRunId(event.runId);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      toast({ title: "Update error", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
      refetchLatest();
      refetchRuns();
    }
  };

  const loadHistoricalRun = async (runId: string) => {
    try {
      const res = await apiRequest("GET", `/api/app-update/runs/${runId}`);
      const data = (await res.json()) as LatestRunResponse;
      if (data.run) {
        // Set the source; displayLogs (useMemo) re-derives the rendered
        // timeline through hydrateRunLog so we always show one settled
        // line per step, regardless of what was previously on screen.
        setHistoricalRun(data);
        // Operator picked a different run from history — drop the
        // live-handoff guard so the historical run renders immediately
        // even if the previous live update id was still pinned.
        setLastLiveRunId(null);
      }
    } catch (err: any) {
      toast({ title: "Failed to load run", description: err.message, variant: "destructive" });
    }
  };

  const handleRollback = async () => {
    if (!confirm("Are you sure you want to rollback to the previous version? This will replace all current code files.")) {
      return;
    }

    setRollingBack(true);
    try {
      let res: Response;
      try {
        res = await apiRequest("POST", "/api/app-update/rollback");
      } catch (err: any) {
        toast({ title: "Rollback failed", description: err.message, variant: "destructive" });
        return;
      }
      const data = await res.json();
      toast({ title: "Rollback complete", description: data.message });
      // After a rollback the post-update "Update complete" UI is no
      // longer accurate. Clear the live-handoff guard, drop any pinned
      // historical run, reset the complete banner, and re-fetch the
      // settled run / status / runs list so the panel reflects the
      // rolled-back state instead of staying frozen on the previous
      // success.
      setLastLiveRunId(null);
      setHistoricalRun(null);
      setUpdateComplete(false);
      setLiveLogs([]);
      queryClient.invalidateQueries({ queryKey: ["/api/app-update/status"] });
      refetchLatest();
      refetchRuns();
    } catch (err: any) {
      toast({ title: "Rollback error", description: err.message, variant: "destructive" });
    } finally {
      setRollingBack(false);
    }
  };

  const getStepIcon = (event: SSEEvent) => {
    if (event.status === "running") return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (event.status === "done") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (event.status === "error") return <XCircle className="w-4 h-4 text-red-500" />;
    if (event.status === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <Package className="w-4 h-4 text-gray-400" />;
  };

  const latestProgress = displayLogs.filter((l) => l.progress !== undefined).slice(-1)[0]?.progress || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Update</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload and apply new versions of the application
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <Package className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            v{status?.currentVersion || "unknown"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Current Version</h3>
              <p className="text-lg font-bold text-blue-600">v{status?.currentVersion || "unknown"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status?.backup.exists ? "bg-green-50" : "bg-gray-50"}`}>
              <Shield className={`w-5 h-5 ${status?.backup.exists ? "text-green-600" : "text-gray-400"}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Backup Status</h3>
              {status?.backup.exists ? (
                <p className="text-sm text-green-600">
                  v{status.backup.version} &middot;{" "}
                  {new Date(status.backup.timestamp!).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-sm text-gray-400">No backup available</p>
              )}
            </div>
          </div>
          {status?.backup.exists && (
            <button
              onClick={handleRollback}
              disabled={rollingBack || updating}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {rollingBack ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {rollingBack ? "Rolling back..." : "Rollback to Previous"}
            </button>
          )}
        </div>
      </div>

      {!updating && (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver
              ? "border-green-400 bg-green-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={onFileChange}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-green-500" />
              <p className="text-sm text-gray-600">Uploading and validating...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                <Upload className="w-7 h-7 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drag and drop your update ZIP file here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  or click to browse &middot; Max 500MB
                </p>
                <p className="text-[11px] text-gray-400 mt-2 max-w-md">
                  Tip: produce the ZIP with{" "}
                  <code className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">
                    npm run build:prod-zip
                  </code>
                  . GitHub&apos;s &quot;Download ZIP&quot; is not supported.
                </p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-md">
                  Package without{" "}
                  <code className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">node_modules/</code>,{" "}
                  <code className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">.git/</code>,{" "}
                  <code className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">.cache/</code>,{" "}
                  <code className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">.update-backups/</code>, or{" "}
                  <code className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">dist/</code>{" "}
                  — the server reinstalls dependencies.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Choose File
              </button>
            </div>
          )}
        </div>
      )}

      {uploadResult && !updating && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4" data-testid="update-preview">
          <div className="flex items-center gap-3">
            <FileArchive className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-900">Update Package Preview</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Current Version</p>
              <p className="text-sm font-semibold text-gray-900">v{uploadResult.currentVersion}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600">New Version</p>
              <p className="text-sm font-semibold text-green-700">v{uploadResult.newVersion}</p>
            </div>
          </div>

          {uploadResult.preview && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Files</p>
                  <p className="text-sm font-semibold text-gray-900" data-testid="preview-file-count">
                    {uploadResult.preview.fileCount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Directories</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {uploadResult.preview.dirCount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total Size</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatBytes(uploadResult.preview.totalSize)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Top-level Items</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {uploadResult.preview.topLevel.length}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Key directories</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "package.json", present: uploadResult.preview.hasPackageJson },
                    { label: "server/", present: uploadResult.preview.hasServer },
                    { label: "client/", present: uploadResult.preview.hasClient },
                  ].map(({ label, present }) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-md border ${
                        present
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-400 border-gray-200"
                      }`}
                    >
                      {present ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Top-level layout</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {uploadResult.preview.topLevel.map((entry) => (
                    <span
                      key={entry}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded"
                    >
                      {entry}
                    </span>
                  ))}
                </div>
              </div>

              {uploadResult.preview.warnings.length > 0 && (
                <div className="space-y-2" data-testid="preview-warnings">
                  {uploadResult.preview.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 flex gap-2 ${
                        w.level === "blocker"
                          ? "bg-red-50 border-red-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                      data-testid={`preview-${w.level}`}
                    >
                      {w.level === "blocker" ? (
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="text-xs">
                        <p className={`font-medium ${w.level === "blocker" ? "text-red-700" : "text-yellow-700"}`}>
                          {w.level === "blocker" ? "Blocker" : "Warning"}
                        </p>
                        <p className={w.level === "blocker" ? "text-red-700" : "text-yellow-700"}>
                          {w.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-700">
                <p className="font-medium">Before proceeding:</p>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  <li>A backup of the current code will be created automatically</li>
                  <li>The .env file and uploads folder will not be modified</li>
                  <li>Dependencies will be reinstalled and the database schema will be updated</li>
                  <li>You will need to restart the application after the update</li>
                  <li>Rollback restores code and dependencies only; database schema changes are not reverted</li>
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={executeUpdate}
            disabled={uploadResult.preview?.hasBlockers}
            data-testid="apply-update-button"
            title={uploadResult.preview?.hasBlockers ? "Resolve blockers before applying this update" : undefined}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600 transition-colors"
          >
            <ArrowDownCircle className="w-4 h-4" />
            {uploadResult.preview?.hasBlockers ? "Cannot Apply: Blockers Present" : "Install Update"}
          </button>
        </div>
      )}

      {(displayLogs.length > 0 || updating) && (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
            <div className="flex items-center gap-2">
              {updating ? (
                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
              ) : updateComplete ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm font-medium text-gray-200">
                {updating
                  ? "Update in progress..."
                  : updateComplete
                  ? "Update complete"
                  : historicalRunId && !updating
                  ? "Previous update log"
                  : "Update log"}
              </span>
              {historicalRunId && !updating && latestRun?.run?.id === historicalRunId && (
                <span className="text-xs text-gray-400">
                  &middot; {new Date(latestRun.run.startedAt).toLocaleString()}
                </span>
              )}
            </div>
            {latestProgress > 0 && (
              <span className="text-xs text-gray-400">{latestProgress}%</span>
            )}
          </div>

          {latestProgress > 0 && (
            <div className="h-1 bg-gray-700">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${latestProgress}%` }}
              />
            </div>
          )}

          <div
            ref={logContainerRef}
            className="p-4 max-h-80 overflow-y-auto font-mono text-sm space-y-2"
          >
            {displayLogs.map((event, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {getStepIcon(event)}
                <span
                  className={`text-sm ${
                    event.status === "error"
                      ? "text-red-400"
                      : event.status === "warning"
                      ? "text-yellow-400"
                      : event.status === "done"
                      ? "text-green-400"
                      : "text-gray-300"
                  }`}
                >
                  {event.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {runsList && runsList.runs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Update History
              </h3>
              <span className="text-xs text-gray-400">
                ({runsList.runs.length})
              </span>
            </div>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showHistory && (
            <div className="mt-3 divide-y divide-gray-100">
              {runsList.runs.map((run) => {
                const isActive = historicalRunId === run.id;
                const statusBadge =
                  run.status === "success"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : run.status === "running"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : run.status === "rolled_back"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : run.status === "interrupted"
                    ? "bg-gray-50 text-gray-700 border-gray-200"
                    : "bg-red-50 text-red-700 border-red-200";
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => loadHistoricalRun(run.id)}
                    disabled={updating}
                    className={`w-full text-left py-3 px-2 -mx-2 rounded-md hover:bg-gray-50 disabled:opacity-50 ${
                      isActive ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">
                          {new Date(run.startedAt).toLocaleString()}
                        </span>
                        {run.fromVersion && run.toVersion && (
                          <span className="text-xs text-gray-500 truncate">
                            v{run.fromVersion} &rarr; v{run.toVersion}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 border rounded-full flex-shrink-0 ${statusBadge}`}
                      >
                        {run.status}
                      </span>
                    </div>
                    {run.triggeredByUsername && (
                      <p className="text-xs text-gray-500 mt-1 ml-5">
                        by {run.triggeredByUsername}
                      </p>
                    )}
                    {run.finalMessage && (
                      <p className="text-xs text-gray-500 mt-1 ml-5 line-clamp-2">
                        {run.finalMessage}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Protected Paths</h3>
        <p className="text-xs text-gray-500 mb-3">
          These files and directories are never modified during an update:
        </p>
        <div className="flex flex-wrap gap-2">
          {[".env", "uploads/", "node_modules/", ".git/", ".update-backups/"].map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded-md"
            >
              <Shield className="w-3 h-3" />
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
