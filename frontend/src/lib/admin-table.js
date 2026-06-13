const PAGE_SIZE = 10;

export { PAGE_SIZE };

export function filterItems(items, query, keys) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    keys.some((key) => {
      const value = key.includes(".")
        ? key.split(".").reduce((obj, part) => obj?.[part], item)
        : item[key];
      return String(value ?? "").toLowerCase().includes(q);
    })
  );
}

export function paginateItems(items, page, pageSize = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
    pageSize,
  };
}
