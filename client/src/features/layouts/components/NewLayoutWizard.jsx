import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
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
import { saveLayout } from "@/services/layouts.api.js";
import { createRoom, createZone, STATUS_DRAFT } from "@shared/schemas/layout.js";

const STEPS = [
  { id: 1, label: "Room" },
  { id: 2, label: "Upload assets" },
  { id: 3, label: "Zone Editor" },
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
 * Admin Layout Onboarding Wizard — Steps 1–3 (Room, Upload, Editor).
 *
 * Step 1 picks an existing Room or creates one inline. Step 2 uploads the
 * background/foreground to Cloudinary under `rooms/{roomId}/...`. Step 3
 * persists a draft layout and hands off to the Zone Editor via `onLaunch`.
 * Wizard state (room, uploaded URLs) lives in this component so back/forward
 * navigation never loses progress.
 */
export default function NewLayoutWizard({ onClose, onLaunch }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("existing"); // "existing" | "new"
  const [room, setRoom] = useState(null); // { id, name }
  const [newRoomName, setNewRoomName] = useState("");
  const [layoutName, setLayoutName] = useState("");
  const [bg, setBg] = useState(null); // { url }
  const [fg, setFg] = useState(null); // { url } | null
  const [uploading, setUploading] = useState(null); // "bg" | "fg"
  const [busy, setBusy] = useState(false); // room create / draft save
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

  const launchEditor = async () => {
    if (!room || !bg || busy) return;
    setBusy(true);
    setError(null);
    try {
      const layoutId = slugify(layoutName) || `${slugify(room.id)}-layout`;
      const config = createRoom({
        id: layoutId,
        name: layoutName.trim(),
        roomId: room.id,
        background: bg.url,
        foreground: fg?.url || null,
        zones: DEFAULT_ZONES.map((z) => createZone({ id: z.id, label: z.label })),
        status: STATUS_DRAFT,
      });
      await saveLayout(layoutId, config);
      onLaunch(layoutId);
    } catch (e) {
      setError(e.message || "Failed to create the draft layout.");
    } finally {
      setBusy(false);
    }
  };

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
              Onboard a new photo layout — room, assets, then the zone editor.
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
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold transition ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {done ? <Check size={12} /> : s.id}
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    active ? "text-slate-800" : done ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 ${
                      done || active ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

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
                kind="background"
                label="Background photo"
                hint="Furniture-removed clean room photo (required)."
                value={bg}
                uploading={uploading === "background"}
                onFile={(f) => handleUpload("background", f)}
                onRemove={() => setBg(null)}
              />
              <AssetUpload
                kind="foreground"
                label="Foreground cutout"
                hint="Furniture-only photo with transparent floor (optional)."
                value={fg}
                uploading={uploading === "foreground"}
                onFile={(f) => handleUpload("foreground", f)}
                onRemove={() => setFg(null)}
              />
            </>
          )}

          {step === 3 && (
            <>
              <div className="mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step 3 · Launch Zone Editor
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  A draft layout will be saved and opened in the Zone Editor, where you draw
                  floor/wall/counter polygons, then save or publish.
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
                        {room?.name} · {slugify(layoutName)} · draft
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
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft size={13} /> Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canContinueStep1 : !bg || uploading}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue <ArrowRight size={13} />
            </button>
          ) : (
            <button
              onClick={launchEditor}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <LayoutGrid size={13} />}
              {busy ? "Creating draft…" : "Open Zone Editor"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetUpload({ kind, label, hint, value, uploading, onFile, onRemove }) {
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
