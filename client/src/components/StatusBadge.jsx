/**
 * Shared layout status pill — Published (green) / Draft (amber).
 * Used consistently across the admin Layouts list, editor header and anywhere
 * a draft/published state needs to be surfaced.
 */
export default function StatusBadge({ status }) {
  const published = status === "published";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        published ? "bg-[#dcfce7] text-[#16A34A]" : "bg-[#fef3c7] text-[#D97706]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-[#16A34A]" : "bg-[#D97706]"}`} />
      {published ? "Published" : "Draft"}
    </span>
  );
}
