/**
 * Shared filter pill row used by the Layouts and Tiles admin screens.
 *
 * Props:
 *  - `categories`: [{ id, label, count }] — the "All" pill is always first.
 *  - `activeId`: the currently selected pill id.
 *  - `onChange(id)`: fired when a pill is clicked.
 */
export default function CategoryFilterPills({ categories = [], activeId = "all", onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {categories.map((cat) => {
        const active = cat.id === activeId;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-[#6D5EF5] bg-[#6D5EF5] text-white shadow-[0_4px_12px_rgba(109,94,245,0.3)]"
                : "border-[#E7E9EE] bg-white text-[#14161A] hover:border-[#6D5EF5]/40 hover:text-[#6D5EF5]"
            }`}
          >
            {cat.label}
            <span
              className={`min-w-[1.1rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none ${
                active ? "bg-white/20 text-white" : "bg-[#F7F8FA] text-[#6B7280]"
              }`}
            >
              {cat.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
