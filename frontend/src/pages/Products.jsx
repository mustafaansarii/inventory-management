import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Alert, Button, Card, EmptyState, Input, Modal, Spinner } from "../components/ui.jsx";

const emptyForm = { name: "", sku: "", price: "", quantity: "" };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.sku.trim()) errors.sku = "SKU is required.";
  if (form.price === "" || Number(form.price) < 0) errors.price = "Price must be 0 or more.";
  if (form.quantity === "" || Number(form.quantity) < 0 || !Number.isInteger(Number(form.quantity)))
    errors.quantity = "Quantity must be a non-negative integer.";
  return errors;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setProducts(await api.listProducts());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      price: String(product.price),
      quantity: String(product.quantity),
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    };

    setSaving(true);
    try {
      if (editing) {
        await api.updateProduct(editing.id, payload);
        setSuccess("Product updated.");
      } else {
        await api.createProduct(payload);
        setSuccess("Product created.");
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await api.deleteProduct(product.id);
      setSuccess("Product deleted.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Products</h2>
        <Button onClick={openCreate}>+ Add Product</Button>
      </div>

      <Alert message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      <Card>
        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState message="No products yet. Add your first product." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">SKU</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Stock</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-slate-700">{p.name}</td>
                    <td className="py-3 text-slate-500">{p.sku}</td>
                    <td className="py-3 text-slate-700">${p.price.toFixed(2)}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.quantity <= 5 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {p.quantity}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="secondary" className="mr-2 px-3 py-1" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="px-3 py-1" onClick={() => handleDelete(p)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "Edit Product" : "Add Product"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name"
            value={form.name}
            error={formErrors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="SKU / Code"
            value={form.sku}
            error={formErrors.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              error={formErrors.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label="Quantity"
              type="number"
              min="0"
              value={form.quantity}
              error={formErrors.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
