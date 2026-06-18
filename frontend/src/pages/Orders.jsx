import { useEffect, useState } from "react";
import { api } from "../api.js";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Modal,
  Select,
  Spinner,
} from "../components/ui.jsx";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ product_id: "", quantity: 1 }]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [o, p, c] = await Promise.all([
        api.listOrders(),
        api.listProducts(),
        api.listCustomers(),
      ]);
      setOrders(o);
      setProducts(p);
      setCustomers(c);
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
    setCustomerId("");
    setLines([{ product_id: "", quantity: 1 }]);
    setFormError("");
    setModalOpen(true);
  }

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { product_id: "", quantity: 1 }]);
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const estimatedTotal = lines.reduce((sum, l) => {
    const product = products.find((p) => String(p.id) === String(l.product_id));
    return sum + (product ? product.price * Number(l.quantity || 0) : 0);
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customerId) return setFormError("Please select a customer.");
    const items = lines
      .filter((l) => l.product_id)
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }));
    if (items.length === 0) return setFormError("Add at least one product line.");
    if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1))
      return setFormError("Quantities must be positive integers.");

    setSaving(true);
    try {
      await api.createOrder({ customer_id: Number(customerId), items });
      setSuccess("Order created and stock updated.");
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(order) {
    if (!confirm(`Cancel order #${order.id}? Stock will be restored.`)) return;
    try {
      await api.deleteOrder(order.id);
      setSuccess("Order cancelled.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function openDetail(order) {
    try {
      setDetail(await api.getOrder(order.id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Orders</h2>
        <Button onClick={openCreate}>+ Create Order</Button>
      </div>

      <Alert message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      <Card>
        {loading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState message="No orders yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Order #</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 font-medium text-slate-700">#{o.id}</td>
                    <td className="py-3 text-slate-600">{o.customer_name}</td>
                    <td className="py-3 font-semibold text-slate-700">${o.total_amount.toFixed(2)}</td>
                    <td className="py-3 text-slate-400">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="secondary" className="mr-2 px-3 py-1" onClick={() => openDetail(o)}>
                        View
                      </Button>
                      <Button variant="danger" className="px-3 py-1" onClick={() => handleDelete(o)}>
                        Cancel
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create order modal */}
      <Modal open={modalOpen} title="Create Order" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert message={formError} onClose={() => setFormError("")} />}

          <Select label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.email})
              </option>
            ))}
          </Select>

          <div className="space-y-3">
            <span className="block text-sm font-medium text-slate-600">Products</span>
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    value={line.product_id}
                    onChange={(e) => updateLine(idx, "product_id", e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                        {p.name} — ${p.price.toFixed(2)} ({p.quantity} in stock)
                      </option>
                    ))}
                  </Select>
                </div>
                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                  className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                {lines.length > 1 && (
                  <Button type="button" variant="secondary" className="px-3 py-2" onClick={() => removeLine(idx)}>
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="secondary" className="text-xs" onClick={addLine}>
              + Add another product
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-500">Estimated total</span>
            <span className="text-lg font-bold text-slate-800">${estimatedTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Placing..." : "Place Order"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Order detail modal */}
      <Modal open={!!detail} title={detail ? `Order #${detail.id}` : ""} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              <p>
                <span className="font-medium">Customer:</span> {detail.customer_name}
              </p>
              <p>
                <span className="font-medium">Date:</span>{" "}
                {detail.created_at ? new Date(detail.created_at).toLocaleString() : "—"}
              </p>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Product</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Unit</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2 text-slate-700">{it.product_name}</td>
                    <td className="py-2">{it.quantity}</td>
                    <td className="py-2">${it.unit_price.toFixed(2)}</td>
                    <td className="py-2 text-right">${it.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="font-medium text-slate-600">Total</span>
              <span className="text-lg font-bold text-slate-800">${detail.total_amount.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
