"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { format } from "date-fns";

// ============================================================
// Types
// ============================================================

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count: { products: number };
}

interface ApiResponse {
  success: boolean;
  data: Category[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

// ============================================================
// API helpers
// ============================================================

async function fetchCategories(page: number): Promise<ApiResponse> {
  const res = await fetch(`/api/v1/admin/categories?page=${page}&limit=20`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json() as Promise<ApiResponse>;
}

async function createCategory(data: CategoryFormData): Promise<void> {
  const res = await fetch("/api/v1/admin/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Failed to create category");
  }
}

async function updateCategory(id: string, data: Partial<CategoryFormData>): Promise<void> {
  const res = await fetch(`/api/v1/admin/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Failed to update category");
  }
}

async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "Failed to delete category");
  }
}

// ============================================================
// Category Form Modal
// ============================================================

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface CategoryFormProps {
  initial?: Category;
  onClose: () => void;
  onSave: (data: CategoryFormData) => void;
  isPending: boolean;
}

function CategoryFormModal({ initial, onClose, onSave, isPending }: CategoryFormProps) {
  const [form, setForm] = useState<CategoryFormData>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    imageUrl: initial?.imageUrl ?? "",
    isActive: initial?.isActive ?? true,
    sortOrder: initial?.sortOrder ?? 0,
  });

  function set<K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNameChange(v: string) {
    set("name", v);
    if (!initial) set("slug", slugify(v));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl space-y-4 mx-4">
        <h3 className="font-semibold text-base">{initial ? "Edit Category" : "New Category"}</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Electronics"
              id="category-name"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Slug *
            </label>
            <input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="electronics"
              id="category-slug"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              id="category-description"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Image URL
            </label>
            <input
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://…"
              id="category-image-url"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
                min={0}
                id="category-sort-order"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <button
                type="button"
                onClick={() => set("isActive", !form.isActive)}
                id="category-active-toggle"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {form.isActive ? (
                  <ToggleRight className="h-6 w-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
              <span className="text-sm font-medium">{form.isActive ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name.trim() || !form.slug.trim() || isPending}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving…" : initial ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function CategoriesTable() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "categories", page],
    queryFn: () => fetchCategories(page),
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success("Category created");
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: Partial<CategoryFormData> }) =>
      updateCategory(id, d),
    onSuccess: () => {
      toast.success("Category updated");
      setEditTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success("Category deleted");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: "Category",
      render: (c) => (
        <div>
          <p className="font-medium text-foreground">{c.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (c) =>
        c.description ? (
          <span className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
            {c.description}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
            c.isActive
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
              : "bg-slate-100 text-slate-600 ring-slate-400/20"
          }`}
        >
          {c.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "sortOrder",
      header: "Order",
      render: (c) => c.sortOrder,
    },
    {
      key: "products",
      header: "Products",
      render: (c) => c._count.products.toLocaleString(),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (c) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {format(new Date(c.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (c) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditTarget(c)}
            id={`edit-category-${c.id}`}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteTarget(c)}
            id={`delete-category-${c.id}`}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-destructive/30 bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          {data?.meta && (
            <span className="text-sm text-muted-foreground">
              {data.meta.total.toLocaleString()} categories
            </span>
          )}
          <button
            onClick={() => setShowForm(true)}
            id="add-category-btn"
            className="ml-auto flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Category
          </button>
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          emptyMessage="No categories found."
          keyExtractor={(c) => c.id}
          page={page}
          totalPages={data?.meta?.totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Create modal */}
      {showForm && (
        <CategoryFormModal
          onClose={() => setShowForm(false)}
          onSave={(formData) => createMutation.mutate(formData)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <CategoryFormModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(formData) => updateMutation.mutate({ id: editTarget.id, data: formData })}
          isPending={updateMutation.isPending}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm shadow-xl space-y-4 mx-4">
            <h3 className="font-semibold text-base">Delete Category</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{deleteTarget.name}</span>?
              {deleteTarget._count.products > 0 && (
                <span className="block mt-1 text-destructive font-medium">
                  ⚠ This category has {deleteTarget._count.products} product
                  {deleteTarget._count.products > 1 ? "s" : ""}. This may fail.
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
