import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutGrid, FileCheck2, PenLine, Grid3X3 } from "lucide-react";
import { fetchLayouts } from "@/services/layouts.api.js";
import { fetchTiles } from "@/services/tiles.api.js";

function StatCard({ icon: Icon, label, value, tone = "purple" }) {
  const tones = {
    purple: "bg-[#6D5EF5]/10 text-[#6D5EF5]",
    green: "bg-[#16A34A]/10 text-[#16A34A]",
    amber: "bg-[#D97706]/10 text-[#D97706]",
    slate: "bg-[#14161A]/5 text-[#14161A]",
  };
  return (
    <div className="rounded-xl border border-[#E7E9EE] bg-white p-5 shadow-[0_4px_16px_rgba(20,22,26,0.06)]">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <p className="font-heading text-3xl font-semibold text-[#14161A]">{value}</p>
      <p className="mt-1 text-xs font-medium text-[#6B7280]">{label}</p>
    </div>
  );
}

/**
 * Admin home / dashboard — a light overview of catalogue health with quick
 * links into the admin tools. Kept intentionally simple.
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState({ layouts: null, published: null, drafts: null, tiles: null });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([fetchLayouts(), fetchTiles({ limit: 1 })])
      .then(([layoutsRes, tilesRes]) => {
        if (cancelled) return;
        const list = layoutsRes.status === "fulfilled" && Array.isArray(layoutsRes.value) ? layoutsRes.value : [];
        setStats({
          layouts: layoutsRes.status === "fulfilled" ? list.length : null,
          published: list.filter((l) => l.status === "published").length,
          drafts: list.filter((l) => l.status === "draft").length,
          tiles:
            tilesRes.status === "fulfilled"
              ? tilesRes.value?.pagination?.totalItems ?? tilesRes.value?.data?.length ?? null
              : null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-[#14161A]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Overview of your StudioTile catalogue and layout templates.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={LayoutGrid} label="Layout templates" value={stats.layouts ?? "…"} tone="purple" />
        <StatCard icon={Grid3X3} label="Tiles in catalogue" value={stats.tiles ?? "…"} tone="slate" />
        <StatCard icon={FileCheck2} label="Published layouts" value={stats.published ?? "…"} tone="green" />
        <StatCard icon={PenLine} label="Draft layouts" value={stats.drafts ?? "…"} tone="amber" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/admin/layouts"
          className="group flex items-center justify-between rounded-xl border border-[#E7E9EE] bg-white p-5 shadow-[0_4px_16px_rgba(20,22,26,0.06)] transition hover:border-[#6D5EF5]/40 hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6D5EF5]/10 text-[#6D5EF5]">
              <LayoutGrid size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#14161A]">Tile Studio</p>
              <p className="text-xs text-[#6B7280]">Manage photo layouts & zone mapping</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-[#6B7280] transition group-hover:translate-x-0.5 group-hover:text-[#6D5EF5]" />
        </Link>
        <Link
          to="/admin/tiles"
          className="group flex items-center justify-between rounded-xl border border-[#E7E9EE] bg-white p-5 shadow-[0_4px_16px_rgba(20,22,26,0.06)] transition hover:border-[#6D5EF5]/40 hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6D5EF5]/10 text-[#6D5EF5]">
              <Grid3X3 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#14161A]">Tile Catalog</p>
              <p className="text-xs text-[#6B7280]">Add & edit catalogue tiles</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-[#6B7280] transition group-hover:translate-x-0.5 group-hover:text-[#6D5EF5]" />
        </Link>
      </div>
    </div>
  );
}
