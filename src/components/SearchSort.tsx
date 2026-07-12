import Link from "next/link";

export function SearchBar({
  placeholder,
  q,
  sort,
  sortOptions,
  basePath,
}: {
  placeholder: string;
  q?: string;
  sort?: string;
  sortOptions?: { value: string; label: string }[];
  basePath: string;
}) {
  return (
    <form method="get" className="no-print mb-4 flex flex-wrap items-center gap-2">
      <input
        name="q"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        className="w-64 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
      />
      {sortOptions && (
        <select
          name="sort"
          defaultValue={sort ?? ""}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="">Sort: default</option>
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>
      )}
      <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
        Search
      </button>
      {(q || sort) && (
        <Link href={basePath} className="px-2 py-1.5 text-sm text-zinc-500 underline">
          Clear
        </Link>
      )}
    </form>
  );
}
