import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useRooms, ROOMS_QUERY_KEY } from "@/features/rooms/hooks/useRooms.js";
import { createRoom as createRoomDoc } from "@/services/rooms.api.js";
import { uploadImage } from "@/services/tiles.api.js";
import { fetchLayout, publishLayout, saveLayout } from "@/services/layouts.api.js";
import { createRoom, createZone, STATUS_DRAFT } from "@shared/schemas/layout.js";
import LayoutEditor from "@/features/layouts/pages/LayoutEditor.jsx";
import LayoutPreview from "@/features/layouts/components/LayoutPreview.jsx";

const STEPS = [
  { id: 1, label: "Room" },
  { id: 2, label: "Upload" },
  { id: 3, label: "Editor" },
  { id: 4, label: "Preview" },
  { id: 5, label: "Publish" },
];

const DEFAULT_ZONES = [
  { id: "floor", label: "Floor" },
  { id: "wall", label: "Wall" },
  { id: "counter", label: "Counter" },
];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Admin Layout Onboarding Wizard — all 5 steps.
 *
 *  1. Room      — pick an existing Room or create one inline.
 *  2. Upload    — background/foreground to Cloudinary under `rooms/{roomId}/…`.
 *  3. Editor    — embed the Zone Editor scoped to the new draft layout.
 *  4. Preview   — live canvas-compositor preview of the draft.
 *  5. Publish   — PATCH /api/layouts/:id to take the draft live.
 *
 * Wizard state (room, URLs, layoutId) lives here so back/forward never loses
 * progress. `onDone(layoutId, { published })` lets the host refresh its list.
 */
export default function NewLayoutWizard({ onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("existing"); // "existing" | "new"
  const [room, setRoom] = useState(null); // { id, name }
  const [newRoomName, setNewRoomName] = useState("");
  const [layoutName, setLayoutName] = useState("");
  const [bg, setBg] = useState(null); // { url }
  const [fg, setFg] = useState(null); // { url } | null
  const [layoutId, setLayoutId] = useState(null);
  const [previewLayout, setPreviewLayout] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(null); // "background" | "foreground"
  const [busy, setBusy] = useState(false); // room create / draft save / publish
  const [error, setError] = useState(null);

  const { rooms, isLoading } = useRooms();
  const queryClient = useQueryClient();

  // When the room changes and the layout name was never edited, follow along.
  const [nameTouched, setNameTouched] = useState(false);
  useEffect(() => {
    if (!nameTouched && room) setLayoutName(room.name);
  }, [room, nameTouched]);

  const selectRoom = (r) => {
    setRoom({ id: r.id, name: r.name });
    setError(null);
  };

  const handleCreateRoom = async () => {
    const name = newRoomName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = slugify(name) || `room-${Date.now()}`;
      const created = await createRoomDoc({ id, name, description: "" });
      setRoom({ id: created.id, name: created.name });
      setNewRoomName("");
      queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEY });
    } catch (e) {
      setError(e.message || "Failed to create room.");
    } finally {
      setBusy(false);
    }
  };

  const canContinueStep1 = useMemo(
    () => !!room && !!layoutName.trim() && !isLoading,
    [room, layoutName, isLoading]
  );

  const handleUpload = async (kind, file) => {
    if (!file || !room || uploading) return;
    setUploading(kind);
    setError(null);
    try {
      const result = await uploadImage(file, `rooms/${room.id}/${kind}`);
      if (kind === "background") setBg({ url: result.url });
      else setFg({ url: result.url });
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  // Step 2 → 3: persist a draft layout (Cloudinary URLs + default zones) so the
  // embedded Zone Editor has something to load, then hand its id to the editor.
  const beginEditor = async () => {
    if (!room || !bg || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = slugify(layoutName) || `${slugify(room.id)}-layout`;
      const config = createRoom({
        id,
        name: layoutName.trim(),
        roomId: room.id,
        background: bg.url,
        foreground: fg?.url || null,
        zones: DEFAULT_ZONES.map((z) => createZone({ id: z.id, label: z.label })),
        status: STATUS_DRAFT,
      });
      await saveLayout(id, config);
      setLayoutId(id);
      onDone(id, { published: false });
      setStep(3);
    } catch (e) {
      setError(e.message || "Failed to save the draft layout.");
    } finally {
      setBusy(false);
    }
  };

  // Step 3 → 4: fetch the latest saved config so the preview reflects the most
  // recent Save Draft, then show the live compositor preview.
  const goPreview = async () => {
    if (!layoutId || previewLoading) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const cfg = await fetchLayout(layoutId);
      setPreviewLayout(cfg);
      setStep(4);
    } catch (e) {
      setError(e.message || "Could not load the draft for preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const publish = async () => {
    if (!layoutId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await publishLayout(layoutId);
      onDone(layoutId, { published: true });
      onClose();
    } catch (e) {
      setError(e.message || "Publishing failed.");
    } finally {
      setBusy(false);
    }
  };

  const finishAsDraft = () => {
    if (layoutId) onDone(layoutId, { published: false });
    onClose();
  };

  const planeCount = useMemo(
    () =>
      (previewLayout?.zones || []).reduce(
        (sum, zone) => sum + (zone.planes || []).filter((p) => (p.polygon || []).length >= 3).length,
        0
      ),
    [previewLayout]
  );

  // --- Step 3: full-screen light view wrapping the embedded Zone Editor ------
  if (step === 3) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-[#F7F8FA]">
        {/* Thin wizard chrome — stepper + close only */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[#E7E9EE] bg-white px-4 py-2">
          <div className="flex-1">
            <WizardStepper steps={STEPS} current={3} />
          </div>
          <button
            onClick={onClose}
            className="ml-2 shrink-0 rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F7F8FA] hover:text-[#14161A]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {layoutId ? (
            <LayoutEditor
              key={layoutId}
              layoutId={layoutId}
              embedded
              hidePublish
              onClose={onClose}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
              Saving draft…
            </div>
          )}
        </div>

        {error && (
          <div className="shrink-0 border-t border-[#E7E9EE] bg-[#fee2e2] px-5 py-2 text-[11px] font-medium text-[#DC2626]">
            {error}
          </div>
        )}

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E7E9EE] bg-white px-5 py-3">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-1.5 rounded-lg border border-[#E7E9EE] px-3.5 py-2 text-sm font-medium text-[#14161A] transition hover:bg-[#F7F8FA]"
          >
            <ArrowLeft size={13} /> Back to uploads
          </button>
          <span className="hidden text-xs text-[#6B7280] sm:block">
            Draw zone polygons, press Save Draft, then continue to the live preview.
          </span>
          <button
            onClick={goPreview}
            disabled={previewLoading}
            className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a4ad6] disabled:opacity-60"
          >
            {previewLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ArrowRight size={13} />
            )}
            {previewLoading ? "Loading…" : "Preview"}
          </button>
        </footer>
      </div>
    );
  }

  // --- Steps 1, 2, 4, 5: white modal ----------------------------------------
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">New Layout Wizard</h2>
            <p className="text-xs text-slate-400">
              Onboard a new photo layout — room, assets, zones, preview, publish.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        <WizardStepper steps={STEPS} current={step} />

        {error && (
          <div className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-5 py-2.5 text-[11px] font-semibold text-red-600">
            <span className="mt-0.5 shrink-0 text-red-400">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Step content */}
        <div className="tile-scrollbar min-h-[280px] flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Step 1 · Room
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      onClick={() => setMode("existing")}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${
                        mode === "existing" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                      }`}
                    >
                      Existing
                    </button>
                    <button
                      onClick={() => setMode("new")}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${
                        mode === "new" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                      }`}
                    >
                      New room
                    </button>
                  </div>
                </div>

                {mode === "existing" ? (
                  isLoading ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {rooms.map((r) => {
                        const active = room?.id === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => selectRoom(r)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                              active
                                ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/25"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <r.icon size={16} className="shrink-0 text-slate-400" />
                            <span
                              className={`truncate text-xs font-semibold ${
                                active ? "text-brand-700" : "text-slate-700"
                              }`}
                            >
                              {r.name}
                            </span>
                            {active && <Check size={13} className="ml-auto shrink-0 text-brand-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="flex items-end gap-2">
                    <label className="block flex-1">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Room name
                      </span>
                      <input
                        autoFocus
                        className="input-field w-full text-xs"
                        placeholder="e.g. Bathroom"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateRoom();
                        }}
                      />
                    </label>
                    <button
                      onClick={handleCreateRoom}
                      disabled={!newRoomName.trim() || busy}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      Create
                    </button>
                  </div>
                )}
              </div>

              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Layout name
                </span>
                <input
                  className="input-field w-full text-xs"
                  placeholder="e.g. Bathroom IRIDIUM"
                  value={layoutName}
                  onChange={(e) => {
                    setNameTouched(true);
                    setLayoutName(e.target.value);
                  }}
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Used as the draft&apos;s name and id.
                </p>
              </div>

              {room && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                  <Building2 size={13} /> Room: {room.name}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step 2 · Upload assets
                </span>
                <span className="text-[10px] text-slate-400">
                  Cloudinary folder: rooms/{room?.id || "…"}
                </span>
              </div>

              <AssetUpload
                label="Background photo"
                hint="Furniture-removed clean room photo (required)."
                value={bg}
                uploading={uploading === "background"}
                onFile={(f) => handleUpload("background", f)}
                onRemove={() => setBg(null)}
              />
              <AssetUpload
                label="Foreground cutout"
                hint="Furniture-only photo with transparent floor (optional)."
                value={fg}
                uploading={uploading === "foreground"}
                onFile={(f) => handleUpload("foreground", f)}
                onRemove={() => setFg(null)}
              />
            </>
          )}

          {step === 4 && (
            <>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step 4 · Live preview
                </span>
                <span className="text-[10px] text-slate-400">
                  Neutral tile applied to drawn planes
                </span>
              </div>

              {previewLoading ? (
                <div className="flex h-64 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Loading draft…
                </div>
              ) : previewLayout ? (
                <LayoutPreview layout={previewLayout} />
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  Draft not loaded yet — go back to the editor and retry.
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <div className="mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step 5 · Publish
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  Publishing makes this layout appear in the Rep-facing layout picker for the{" "}
                  {room?.name || "selected"} room.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid grid-cols-2 gap-0.5 rounded-md bg-slate-900 p-1">
                      <div className="h-3 w-3 rounded-sm bg-brand-400" />
                      <div className="h-3 w-3 rounded-sm bg-white/25" />
                      <div className="h-3 w-3 rounded-sm bg-white/25" />
                      <div className="h-3 w-3 rounded-sm bg-brand-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{layoutName}</p>
                      <p className="text-[10px] text-slate-400">
                        {room?.name} · {layoutId} · draft
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-600">
                    Draft
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                  <Thumb label="Background" url={bg?.url} />
                  <Thumb label="Foreground" url={fg?.url} />
                </div>
                <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-semibold text-slate-500">
                  <LayoutGrid size={13} className="text-slate-400" />
                  {planeCount} completed plane{planeCount === 1 ? "" : "s"} across zones
                  {planeCount === 0 && " — tiles won't render until planes are drawn"}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          {step === 1 ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={busy || previewLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft size={13} />
              {step === 4 ? "Back to editor" : "Back"}
            </button>
          )}

          <div className="flex items-center gap-2">
            {step === 5 && (
              <button
                onClick={finishAsDraft}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Save as draft &amp; close
              </button>
            )}

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!canContinueStep1}
                className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5a4ad6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue <ArrowRight size={13} />
              </button>
            )}

            {step === 2 && (
              <button
                onClick={beginEditor}
                disabled={!bg || uploading || busy}
                className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5a4ad6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <LayoutGrid size={13} />}
                {busy ? "Saving draft…" : "Open Zone Editor"}
              </button>
            )}

            {step === 4 && (
              <button
                onClick={() => setStep(5)}
                disabled={previewLoading}
                className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5a4ad6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Publish <ArrowRight size={13} />
              </button>
            )}

            {step === 5 && (
              <button
                onClick={publish}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-[#6D5EF5] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#5a4ad6] disabled:opacity-60"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {busy ? "Publishing…" : "Publish layout"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WizardStepper({ steps, current }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#E7E9EE] bg-[#F7F8FA] px-5 py-3">
      {steps.map((s, i) => {
        const active = current === s.id;
        const done = current > s.id;
        return (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold transition ${
                done
                  ? "bg-[#6D5EF5] text-white"
                  : active
                    ? "bg-[#6D5EF5] text-white ring-4 ring-[#6D5EF5]/15"
                    : "border border-[#E7E9EE] bg-white text-[#6B7280]"
              }`}
            >
              {done ? <Check size={12} /> : s.id}
            </div>
            <span
              className={`text-[11px] font-bold ${
                active ? "text-[#14161A]" : done ? "text-[#6D5EF5]" : "text-[#9CA3AF]"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${done || active ? "bg-[#6D5EF5]" : "bg-[#E7E9EE]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AssetUpload({ label, hint, value, uploading, onFile, onRemove }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-3 ${
        value ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"
      }`}
    >
      {value ? (
        <img src={value.url} alt={label} className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover" />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-300">
          <ImagePlus size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-400">{hint}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button
              onClick={onRemove}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-red-500 transition hover:bg-red-50"
            >
              <X size={12} /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Thumb({ label, url }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      {url ? (
        <img src={url} alt={label} className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] font-semibold text-slate-400">
          Not uploaded
        </div>
      )}
    </div>
  );
}
