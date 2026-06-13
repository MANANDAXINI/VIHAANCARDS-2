"use client";

import { useEffect, useState } from "react";
import { AdminPagination, AdminSearchBar, useAdminTableState } from "@/components/AdminTableTools";
import { adminCatalogApi, API_URL } from "@/lib/api";
import { filterItems, paginateItems } from "@/lib/admin-table";
import { toast } from "@/lib/toast";
import { btnClass, ui } from "@/lib/ui";

function formatPhone(phone) {
  return phone?.startsWith("g-") ? "Not set" : phone;
}

function CatalogTable({ title, items, columns, searchKeys, onEdit, onDelete, onToggleActive }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useAdminTableState(search, setPage);

  const filtered = filterItems(items, search, searchKeys);
  const { items: pageItems, page: safePage, totalPages, total } = paginateItems(filtered, page);

  return (
    <section className={ui.adminCard}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={ui.adminH3}>{title}</h3>
        <div className="w-full sm:w-64">
          <AdminSearchBar
            value={search}
            onChange={setSearch}
            placeholder={`Search ${title.toLowerCase()}...`}
          />
        </div>
      </div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key} className={ui.th}>{c.label}</th>)}
              <th className={ui.th}>Active</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td className={ui.td} colSpan={columns.length + 2}>No items found</td></tr>
            ) : pageItems.map((item) => (
              <tr key={item.id}>
                {columns.map((c) => <td key={c.key} className={ui.td}>{item[c.key]}</td>)}
                <td className={ui.td}>
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={() => onToggleActive(item)}
                  />
                </td>
                <td className={ui.td}>
                  <div className="flex flex-wrap gap-2">
                    <button className={btnClass("ghost", true)} type="button" onClick={() => onEdit(item)}>Edit</button>
                    <button className={btnClass("ghost", true)} type="button" onClick={() => onDelete(item.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination page={safePage} totalPages={totalPages} total={total} onPageChange={setPage} />
    </section>
  );
}

export function AdminPaperTypesSection() {
  const [paperTypes, setPaperTypes] = useState([]);
  const [paperForm, setPaperForm] = useState({ name: "", availableQuantity: "", ratePerThousand: "" });
  const [editPaper, setEditPaper] = useState(null);

  async function load() {
    const p = await adminCatalogApi.paperTypes();
    setPaperTypes(p.items);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, []);

  async function addPaperType(event) {
    event.preventDefault();
    try {
      if (editPaper) {
        await adminCatalogApi.updatePaperType(editPaper.id, {
          name: paperForm.name,
          availableQuantity: Number(paperForm.availableQuantity),
          ratePerThousand: Number(paperForm.ratePerThousand),
        });
        setEditPaper(null);
      } else {
        await adminCatalogApi.createPaperType({
          name: paperForm.name,
          availableQuantity: Number(paperForm.availableQuantity),
          ratePerThousand: Number(paperForm.ratePerThousand),
        });
      }
      setPaperForm({ name: "", availableQuantity: "", ratePerThousand: "" });
      await load();
      toast.success("Paper type saved.");
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>Paper Type (GSM) — stock &amp; base rate</h3>
        <form className={ui.grid2} onSubmit={addPaperType}>
          <div className={ui.field}>
            <label className={ui.label}>Name</label>
            <input className={ui.input} value={paperForm.name} onChange={(e) => setPaperForm({ ...paperForm, name: e.target.value })} required />
          </div>
          <div className={ui.field}>
            <label className={ui.label}>Available quantity (stock)</label>
            <input className={ui.input} type="number" min="0" value={paperForm.availableQuantity} onChange={(e) => setPaperForm({ ...paperForm, availableQuantity: e.target.value })} required />
          </div>
          <div className={ui.field}>
            <label className={ui.label}>Rate per 1000 (Rs.)</label>
            <input className={ui.input} type="number" min="0" value={paperForm.ratePerThousand} onChange={(e) => setPaperForm({ ...paperForm, ratePerThousand: e.target.value })} />
          </div>
          <div className={`${ui.field} self-end`}>
            <div className="flex flex-wrap gap-2">
              <button className={btnClass("primary")} type="submit">{editPaper ? "Update" : "Add"} Paper</button>
              {editPaper && (
                <button className={btnClass("ghost")} type="button" onClick={() => { setEditPaper(null); setPaperForm({ name: "", availableQuantity: "", ratePerThousand: "" }); }}>Cancel</button>
              )}
            </div>
          </div>
        </form>
      </section>
      <CatalogTable
        title={`Paper Types (${paperTypes.length})`}
        items={paperTypes}
        searchKeys={["name", "availableQuantity", "ratePerThousand"]}
        columns={[
          { key: "name", label: "Name" },
          { key: "availableQuantity", label: "Stock" },
          { key: "ratePerThousand", label: "Rate/1000" },
        ]}
        onEdit={(item) => {
          setEditPaper(item);
          setPaperForm({
            name: item.name,
            availableQuantity: String(item.availableQuantity),
            ratePerThousand: String(item.ratePerThousand),
          });
        }}
        onDelete={async (id) => {
          try {
            await adminCatalogApi.deletePaperType(id);
            await load();
            toast.success("Paper type deleted.");
          } catch (e) {
            toast.error(e.message);
          }
        }}
        onToggleActive={async (item) => {
          try {
            await adminCatalogApi.updatePaperType(item.id, { active: !item.active });
            await load();
            toast.success("Paper type updated.");
          } catch (e) {
            toast.error(e.message);
          }
        }}
      />
    </div>
  );
}

export function AdminSizesSection() {
  const [sizes, setSizes] = useState([]);
  const [sizeForm, setSizeForm] = useState({ name: "" });
  const [editSize, setEditSize] = useState(null);

  async function load() {
    const s = await adminCatalogApi.sizes();
    setSizes(s.items);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, []);

  async function addSize(event) {
    event.preventDefault();
    try {
      if (editSize) {
        await adminCatalogApi.updateSize(editSize.id, { name: sizeForm.name });
        setEditSize(null);
      } else {
        await adminCatalogApi.createSize({ name: sizeForm.name });
      }
      setSizeForm({ name: "" });
      await load();
      toast.success("Size saved.");
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>Add / Edit Size</h3>
        <form className={ui.grid2} onSubmit={addSize}>
          <div className={ui.field}>
            <label className={ui.label}>Size name</label>
            <input className={ui.input} value={sizeForm.name} onChange={(e) => setSizeForm({ name: e.target.value })} required />
          </div>
          <div className={`${ui.field} self-end`}>
            <div className="flex flex-wrap gap-2">
              <button className={btnClass("primary")} type="submit">{editSize ? "Update" : "Add"} Size</button>
              {editSize && (
                <button className={btnClass("ghost")} type="button" onClick={() => { setEditSize(null); setSizeForm({ name: "" }); }}>Cancel</button>
              )}
            </div>
          </div>
        </form>
      </section>
      <CatalogTable
        title={`Sizes (${sizes.length})`}
        items={sizes}
        searchKeys={["name"]}
        columns={[{ key: "name", label: "Size" }]}
        onEdit={(item) => { setEditSize(item); setSizeForm({ name: item.name }); }}
        onDelete={async (id) => {
          try {
            await adminCatalogApi.deleteSize(id);
            await load();
            toast.success("Size deleted.");
          } catch (e) {
            toast.error(e.message);
          }
        }}
        onToggleActive={async (item) => {
          try {
            await adminCatalogApi.updateSize(item.id, { active: !item.active });
            await load();
            toast.success("Size updated.");
          } catch (e) {
            toast.error(e.message);
          }
        }}
      />
    </div>
  );
}

export function AdminPrintingSidesSection() {
  const [printingSides, setPrintingSides] = useState([]);
  const [sideForm, setSideForm] = useState({ name: "" });
  const [editSide, setEditSide] = useState(null);

  async function load() {
    const ps = await adminCatalogApi.printingSides();
    setPrintingSides(ps.items);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, []);

  async function addSide(event) {
    event.preventDefault();
    try {
      if (editSide) {
        await adminCatalogApi.updatePrintingSide(editSide.id, { name: sideForm.name });
        setEditSide(null);
      } else {
        await adminCatalogApi.createPrintingSide({ name: sideForm.name });
      }
      setSideForm({ name: "" });
      await load();
      toast.success("Printing side saved.");
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>Add / Edit Printing Side</h3>
        <form className={ui.grid2} onSubmit={addSide}>
          <div className={ui.field}>
            <label className={ui.label}>Side name</label>
            <input className={ui.input} value={sideForm.name} onChange={(e) => setSideForm({ name: e.target.value })} required />
          </div>
          <div className={`${ui.field} self-end`}>
            <div className="flex flex-wrap gap-2">
              <button className={btnClass("primary")} type="submit">{editSide ? "Update" : "Add"} Side</button>
              {editSide && (
                <button className={btnClass("ghost")} type="button" onClick={() => { setEditSide(null); setSideForm({ name: "" }); }}>Cancel</button>
              )}
            </div>
          </div>
        </form>
      </section>
      <CatalogTable
        title={`Printing Sides (${printingSides.length})`}
        items={printingSides}
        searchKeys={["name"]}
        columns={[{ key: "name", label: "Side" }]}
        onEdit={(item) => { setEditSide(item); setSideForm({ name: item.name }); }}
        onDelete={async (id) => {
          try {
            await adminCatalogApi.deletePrintingSide(id);
            await load();
            toast.success("Printing side deleted.");
          } catch (e) {
            toast.error(e.message);
          }
        }}
        onToggleActive={async (item) => {
          try {
            await adminCatalogApi.updatePrintingSide(item.id, { active: !item.active });
            await load();
            toast.success("Printing side updated.");
          } catch (e) {
            toast.error(e.message);
          }
        }}
      />
    </div>
  );
}

export function AdminQrSection() {
  const [qr, setQr] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const q = await adminCatalogApi.qr();
    setQr(q.qr);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, []);

  async function uploadQr(event) {
    event.preventDefault();
    const file = event.target.image?.files?.[0];
    if (!file) {
      toast.error("Please choose a QR image file.");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);
    try {
      await adminCatalogApi.uploadQr(formData);
      await load();
      toast.success(qr?.imageUrl ? "QR replaced successfully." : "QR uploaded successfully.");
      event.target.reset();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function removeQr() {
    if (!qr?.imageUrl) return;
    if (!window.confirm("Remove this QR? Customers will not see a payment QR until you upload a new one.")) return;
    setDeleting(true);
    try {
      await adminCatalogApi.deleteQr();
      await load();
      toast.info("QR removed. Upload a new image when ready.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <section className={ui.adminCard}>
        <h3 className={ui.adminH3}>Payment QR Image</h3>
        <p className={`${ui.muted} ${ui.small}`}>Customers see this QR on the order payment page (tap to reveal).</p>

        {qr?.imageUrl ? (
          <div className="relative inline-block max-w-xs rounded-lg border border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-lg leading-none text-slate-600 shadow-sm hover:bg-red-50 hover:text-red-600"
              onClick={removeQr}
              disabled={deleting}
              aria-label="Remove QR"
              title="Remove QR"
            >
              ×
            </button>
            <img src={`${API_URL}${qr.imageUrl}`} alt="Current payment QR" className="max-h-48 w-full rounded object-contain" />
            <p className={`${ui.muted} ${ui.small} mt-2`}>Current QR is live. Use Replace to upload a new image, or × to remove.</p>
          </div>
        ) : (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No QR uploaded yet. Add one below.
          </p>
        )}

        <form onSubmit={uploadQr} className="grid gap-4">
          <div className={ui.field}>
            <label className={ui.label}>{qr?.imageUrl ? "Replace QR image" : "Upload QR image"}</label>
            <input className={ui.input} type="file" name="image" accept="image/*" required />
          </div>
          <div>
            <button className={btnClass("primary")} type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : qr?.imageUrl ? "Replace QR" : "Upload QR"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export { formatPhone };
