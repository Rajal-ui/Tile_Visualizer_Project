import { useMemo, useState } from "react";
import { X, ChevronRight, Grid3X3 } from "lucide-react";
import { useWorkspace } from "@/store/workspace.context.jsx";
import { useTiles } from "@/features/catalogue/hooks/useTiles.js";
import { isTileCompatibleWithSurface } from "@/features/catalogue/lib/tile-adapter.js";
import { textureThumbnailUrl } from "@/lib/textures.js";
import TileModal from "@/features/catalogue/components/TileModal.jsx";

export default function TileSwapPanel({ onOpenCatalogue }) {
  const {
    room,
    surfaces,
    surface,
    setSurface,
    activeTile,
    applyTile,
    removeTile,
    hasLayout,
  } = useWorkspace();
  const { tiles: catalogueTiles } = useTiles();
  const [detail, setDetail] = useState(null);

  // Quick swap lists tiles for the active surface tab (zone filter follows the
  // surface being edited, since the surface tabs already cover floor/wall/counter).
  const roomTiles = useMemo(
    () =>
      catalogueTiles.filter(
        (t) => t.rooms.includes(room.id) && isTileCompatibleWithSurface(t, surface)
      ),
    [catalogueTiles, room.id, surface]
  );

  const surfaceTabs = surfaces.map((s) => ({ key: s, label: s.toUpperCase() }));


  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Surface Tabs */}
      <div className="flex border-b border-slate-200">
        {surfaceTabs.map((tab) => {
          const active = surface === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSurface(tab.key)}
              className={`relative flex-1 px-3 py-2.5 text-[10px] font-bold tracking-widest transition ${
                active ? "text-amber-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Applied Tile Info */}
      <div className="border-b border-slate-100 px-3 py-2.5">
        <p className="mb-1.5 text-[9px] font-bold tracking-widest text-slate-400">
          APPLIED TO {surface.toUpperCase()}
        </p>
        {activeTile ? (
          <div className="flex items-center gap-2.5">
            <div
              className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-cover bg-center"
              style={{ backgroundImage: `url(${textureThumbnailUrl(activeTile)})` }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">{activeTile.name}</p>
              <p className="text-[10px] text-slate-400">
                {activeTile.sku || activeTile.category} · {activeTile.finish}
              </p>
            </div>
            <button
              onClick={() => removeTile(surface)}
              className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              title="Remove tile"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">No tile applied</p>
        )}
      </div>

      {/* Quick Swap Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <p className="text-[9px] font-bold tracking-widest text-slate-400">Quick Swap</p>
        <button
          onClick={onOpenCatalogue}
          className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600/70 transition hover:text-amber-600"
        >
          Browse Catalogue <ChevronRight size={11} />
        </button>
      </div>

      {/* Tile Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
        {!hasLayout && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-medium text-amber-700">
            Select a layout first to apply tiles to this room.
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {roomTiles.map((tile) => {
            const isActive = activeTile?.id === tile.id;
            return (
              <button
                key={tile.id}
                onClick={() => applyTile(tile.id, surface)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDetail(tile);
                }}
                disabled={!hasLayout}
                className={`group relative overflow-hidden rounded-lg transition ${
                  !hasLayout ? "cursor-not-allowed opacity-40" : ""
                } ${
                  isActive
                    ? "ring-2 ring-amber-500 ring-offset-1 ring-offset-white"
                    : "ring-1 ring-slate-200 hover:ring-slate-300"
                }`}
              >
                <div className="aspect-square w-full overflow-hidden bg-slate-100">
                  <div
                    className="h-full w-full bg-cover bg-center transition duration-200 group-hover:scale-105"
                    style={{ backgroundImage: `url(${textureThumbnailUrl(tile)})` }}
                  />
                </div>
                <div className="bg-white px-1.5 py-1">
                  <p className="truncate text-[9px] font-medium text-slate-600">{tile.name}</p>
                </div>
              </button>
            );
          })}
        </div>

        {roomTiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Grid3X3 size={20} className="mb-2 text-slate-300" />
            <p className="text-[11px] text-slate-400">No tiles for this room</p>
          </div>
        )}
      </div>

      {detail && <TileModal tile={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
