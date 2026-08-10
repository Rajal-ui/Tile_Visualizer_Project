import { useState } from "react";
import { Upload, ArrowLeft, Save, ChevronRight, RefreshCw, Sparkles, CheckCircle2, Download } from "lucide-react";
import SegmentCanvas from "../components/SegmentCanvas.jsx";
import { generateFeatheredMask } from "../utils/mask-export.js";
import { segmentImageClientSide } from "../utils/segment-client.js";

const DEFAULT_CORNERS = {
  Floor: [],
  Wall: [],
  Counter: [],
};

export default function AdminMaskTool() {
  const [step, setStep] = useState(1); // 1: upload, 2: label, 3: corners, 4: complete
  const [layoutName, setLayoutName] = useState("");
  const [file, setFile] = useState(null);
  const [imgElement, setImgElement] = useState(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [segDims, setSegDims] = useState({ w: 0, h: 0 });

  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [assignedRegions, setAssignedRegions] = useState({}); // { regionId: "Floor" | "Wall" | "Counter" | "Ignore" }
  
  const [selectedZone, setSelectedZone] = useState("Floor");
  const [corners, setCorners] = useState(DEFAULT_CORNERS);
  const [saveResult, setSaveResult] = useState(null);

  // File selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (!layoutName) {
      const baseName = selectedFile.name.split(".")[0];
      setLayoutName(baseName.replace(/[-_]/g, " "));
    }

    // Load image elements for sizes
    const url = URL.createObjectURL(selectedFile);
    const img = new Image();
    img.onload = () => {
      setImgElement(img);
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;
  };

  // Run segmentation — tries backend first, falls back to client-side K-Means
  const handleStartSegmentation = async () => {
    if (!file || !layoutName || !imgElement) return;
    setLoading(true);

    try {
      // Try backend first (faster, more accurate)
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/segment", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(8000), // 8s timeout
      });

      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          setRegions(data.regions);
          setSegDims({ w: data.width, h: data.height });
          setStep(2);
          return;
        }
      }
    } catch (_) {
      // Backend unavailable — fall through to client-side
    }

    // Client-side K-Means fallback (works 100% offline)
    try {
      const result = await segmentImageClientSide(imgElement);
      setRegions(result.regions);
      setSegDims({ w: result.width, h: result.height });
      setStep(2);
    } catch (err) {
      console.error(err);
      alert("Segmentation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle region labeling click
  const handleRegionClick = (region, e) => {
    // Open picker popup or directly assign selected zone
    setAssignedRegions((prev) => ({
      ...prev,
      [region.id]: prev[region.id] === selectedZone ? null : selectedZone,
    }));
  };

  // Corners change
  const handleCornersChange = (zone, newCorners) => {
    setCorners((prev) => ({
      ...prev,
      [zone]: newCorners,
    }));
  };

  // Reset corners for active zone
  const handleResetCorners = () => {
    setCorners((prev) => ({
      ...prev,
      [selectedZone]: [],
    }));
  };

  // Submit and save layout — tries backend, falls back to client-only download
  const handleSaveLayout = async () => {
    setLoading(true);
    try {
      const labels = ["Floor", "Wall", "Counter"];
      const zonesToSave = [];

      for (const label of labels) {
        const zoneRegions = regions.filter((r) => assignedRegions[r.id] === label);
        if (zoneRegions.length === 0) continue;

        const maskDataUrl = generateFeatheredMask(
          zoneRegions,
          segDims.w,
          segDims.h,
          imgDims.w,
          imgDims.h,
          2
        );

        const zoneCorners = corners[label] || [];
        const scaledCorners = zoneCorners.map(([cx, cy]) => [
          Math.round(cx * (imgDims.w / segDims.w)),
          Math.round(cy * (imgDims.h / segDims.h)),
        ]);

        zonesToSave.push({
          label,
          corners: scaledCorners.length === 4 ? scaledCorners : null,
          maskDataUrl,
          lightMultiply: label === "Floor" ? 0.55 : label === "Wall" ? 0.45 : 0.4,
        });
      }

      // Try backend
      let savedViaBackend = false;
      try {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("name", layoutName);
        formData.append("zonesJson", JSON.stringify(zonesToSave));

        const res = await fetch("/api/admin/save-layout", {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const result = await res.json();
          if (!result.error) {
            setSaveResult(result.config);
            setStep(4);
            savedViaBackend = true;
          }
        }
      } catch (_) {
        // Backend not available
      }

      if (!savedViaBackend) {
        // Client-only: auto-download masks + config.json
        const layoutId = layoutName.toLowerCase().replace(/\s+/g, "-");
        const zonesConfig = [];

        for (const zone of zonesToSave) {
          const cleanLabel = zone.label.toLowerCase().replace(/\s+/g, "-");
          // Trigger mask download
          const a = document.createElement("a");
          a.href = zone.maskDataUrl;
          a.download = `${cleanLabel}-mask.png`;
          a.click();

          zonesConfig.push({
            id: zone.label,
            label: zone.label,
            maskSrc: `/assets/room-layouts/${layoutId}/${cleanLabel}-mask.png`,
            corners: zone.corners,
            lightMultiply: zone.lightMultiply,
          });
        }

        const config = {
          id: layoutId,
          name: layoutName,
          backgroundImage: `/assets/room-layouts/${layoutId}/photo.jpg`,
          zones: zonesConfig,
        };

        // Download config.json
        const configBlob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
        const ca = document.createElement("a");
        ca.href = URL.createObjectURL(configBlob);
        ca.download = "config.json";
        ca.click();

        setSaveResult({ ...config, clientOnly: true });
        setStep(4);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate masks: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = "/"}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
            >
              <ArrowLeft size={14} /> Back to App
            </button>
            <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">
              Layout <span className="text-amber-500">Onboarding Console</span>
            </h1>
          </div>

          {/* Steps Indicator */}
          <div className="hidden items-center gap-2 text-xs sm:flex">
            <div className={`flex items-center gap-1.5 ${step >= 1 ? "text-amber-500 font-bold" : "text-slate-500"}`}>
              <span>1. Upload</span>
              <ChevronRight size={12} className="text-slate-600" />
            </div>
            <div className={`flex items-center gap-1.5 ${step >= 2 ? "text-amber-500 font-bold" : "text-slate-500"}`}>
              <span>2. Segment Zones</span>
              <ChevronRight size={12} className="text-slate-600" />
            </div>
            <div className={`flex items-center gap-1.5 ${step >= 3 ? "text-amber-500 font-bold" : "text-slate-500"}`}>
              <span>3. Corners & Plane</span>
              <ChevronRight size={12} className="text-slate-600" />
            </div>
            <div className={`flex items-center gap-1.5 ${step >= 4 ? "text-emerald-500 font-bold" : "text-slate-500"}`}>
              <span>4. Saved</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6">
        {step === 1 && (
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-12">
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center shadow-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                <Upload size={24} />
              </div>
              <h2 className="mt-4 text-base font-bold text-white">Upload New Room Layout</h2>
              <p className="mt-2 text-xs text-slate-400">
                Select a high-resolution base photo. The backend will analyze color regions to build automatic masks.
              </p>

              <div className="mt-6 space-y-4">
                <div className="text-left">
                  <label className="text-xs font-semibold text-slate-400">Layout Name</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-850 px-3 py-2 text-xs text-slate-100 placeholder-slate-550 focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Kitchen Iridium"
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="layout-file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="layout-file"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-white transition hover:bg-slate-700"
                  >
                    Select Room Photo
                  </label>
                </div>

                {file && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3 text-left text-xs">
                    <span className="truncate text-slate-300 font-semibold">{file.name}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {imgDims.w}x{imgDims.h} px
                    </span>
                  </div>
                )}

                <button
                  onClick={handleStartSegmentation}
                  disabled={!file || !layoutName || loading}
                  className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold text-slate-950 transition ${
                    file && layoutName && !loading
                      ? "bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/10"
                      : "bg-slate-800 text-slate-550 cursor-not-allowed"
                  }`}
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {loading ? "Running Segmentation..." : "Analyze Image Regions"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left side canvas */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white sm:text-base">Define Surface Zones</h2>
                  <p className="text-xs text-slate-400">
                    Click the segmented color regions on the image to assign them to active zone (Floor, Wall, Counter).
                  </p>
                </div>
              </div>

              <SegmentCanvas
                imgElement={imgElement}
                regions={regions}
                mode="label"
                selectedZone={selectedZone}
                assignedRegions={assignedRegions}
                corners={corners}
                onRegionClick={handleRegionClick}
                width={segDims.w}
                height={segDims.h}
              />
            </div>

            {/* Right side controls */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Label Tools</h3>
              
              <div className="mt-4 space-y-2">
                {[
                  { label: "Floor", color: "bg-amber-500", desc: "Flooring surfaces to tile" },
                  { label: "Wall", color: "bg-blue-500", desc: "Backsplash or wall tiles" },
                  { label: "Counter", color: "bg-emerald-500", desc: "Kitchen counters or slabs" },
                ].map((z) => {
                  const active = selectedZone === z.label;
                  const count = regions.filter((r) => assignedRegions[r.id] === z.label).length;
                  return (
                    <button
                      key={z.label}
                      onClick={() => setSelectedZone(z.label)}
                      className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition ${
                        active ? "bg-slate-800 border border-slate-700" : "bg-slate-950/40 border border-transparent hover:bg-slate-950"
                      }`}
                    >
                      <span className={`mt-0.5 h-3.5 w-3.5 rounded-full shrink-0 ${z.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{z.label}</span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                            {count} segments
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{z.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-lg bg-slate-950 p-3 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300">Tips:</p>
                <ul className="mt-1 list-disc pl-4 space-y-1">
                  <li>Click regions to add/remove them from the active zone.</li>
                  <li>A single zone can consist of multiple disjoint regions.</li>
                  <li>Click a zone type above to change which zone you are labeling.</li>
                </ul>
              </div>

              <div className="mt-auto pt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
                >
                  Upload New
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300 shadow-md shadow-amber-400/5"
                >
                  Next: Perspective <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left side canvas */}
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-bold text-white sm:text-base">Corner Point Calibration</h2>
                <p className="text-xs text-slate-400">
                  Select a zone, then click 4 corners directly on the image to set the perspective coordinates (Top-Left, Top-Right, Bottom-Right, Bottom-Left).
                </p>
              </div>

              <SegmentCanvas
                imgElement={imgElement}
                regions={regions}
                mode="corners"
                selectedZone={selectedZone}
                assignedRegions={assignedRegions}
                corners={corners}
                onCornersChange={handleCornersChange}
                width={segDims.w}
                height={segDims.h}
              />
            </div>

            {/* Right side controls */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Zone Corners</h3>
              
              <div className="mt-4 space-y-2">
                {["Floor", "Wall", "Counter"].map((label) => {
                  const active = selectedZone === label;
                  const ptsCount = (corners[label] || []).length;
                  const isConfigured = ptsCount === 4;

                  return (
                    <button
                      key={label}
                      onClick={() => setSelectedZone(label)}
                      className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition ${
                        active ? "bg-slate-800 border border-slate-700" : "bg-slate-950/40 border border-transparent hover:bg-slate-950"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          label === "Floor" ? "bg-amber-500" : label === "Wall" ? "bg-blue-500" : "bg-emerald-500"
                        }`} />
                        <span className="text-xs font-bold text-white">{label} Perspective</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isConfigured ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                      }`}>
                        {ptsCount}/4 points
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Guide */}
              <div className="mt-6 rounded-lg bg-slate-950 p-3 text-[11px] text-slate-400 space-y-2">
                <p className="font-semibold text-slate-350">Click Order Guide:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Top-Left boundary</li>
                  <li>Top-Right boundary</li>
                  <li>Bottom-Right boundary</li>
                  <li>Bottom-Left boundary</li>
                </ol>
                <p className="mt-1 text-[10px] text-slate-500 italic">
                  Drag the placed dots on the canvas to fine-tune alignment.
                </p>
                <button
                  onClick={handleResetCorners}
                  disabled={(corners[selectedZone] || []).length === 0}
                  className="mt-2 text-[10px] font-bold text-red-400 underline decoration-dotted transition disabled:opacity-40"
                >
                  Clear corners for {selectedZone}
                </button>
              </div>

              <div className="mt-auto pt-6 flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-lg bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
                >
                  Back to Zones
                </button>
                <button
                  onClick={handleSaveLayout}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300 shadow-md shadow-amber-400/5"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {loading ? "Saving Layout..." : "Save Layout"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && saveResult && (
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-12">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="mt-4 text-base font-bold text-white">Layout Saved!</h2>
              {saveResult.clientOnly && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-[11px] text-amber-300">
                  <p className="font-bold">⬇ Files downloaded to your Downloads folder.</p>
                  <p className="mt-1 text-amber-400/80">Place the mask PNGs and config.json inside:</p>
                  <code className="mt-1 block text-[10px] text-amber-200">
                    client/public/assets/room-layouts/{saveResult.id}/
                  </code>
                  <p className="mt-1">Also copy your room photo there as <code>photo.jpg</code>.</p>
                </div>
              )}

              <div className="mt-4 rounded-lg bg-slate-950 p-4 text-left font-mono text-[10px] text-slate-400 space-y-1">
                <div>ID: {saveResult.id}</div>
                <div>Name: {saveResult.name}</div>
                <div className="pt-2 text-slate-350">Zones:</div>
                {saveResult.zones.map((z) => (
                  <div key={z.id} className="pl-4">
                    - {z.label} (feathered mask, {z.corners ? "perspective ✓" : "flat repeat"})
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => window.location.href = "/"}
                  className="w-full rounded-xl bg-amber-400 py-3 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
                >
                  Go to Visualizer
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setImgElement(null);
                    setAssignedRegions({});
                    setCorners(DEFAULT_CORNERS);
                    setLayoutName("");
                    setSaveResult(null);
                    setStep(1);
                  }}
                  className="text-xs font-semibold text-slate-400 underline transition hover:text-slate-300"
                >
                  Onboard Another Layout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
