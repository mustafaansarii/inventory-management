import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Alert, Card, EmptyState, Spinner } from "../components/ui.jsx";

function Stat({ label, value, color }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .dashboardSummary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
      <Alert message={error} onClose={() => setError("")} />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total Products" value={data.total_products} color="text-indigo-600" />
            <Stat label="Total Customers" value={data.total_customers} color="text-emerald-600" />
            <Stat label="Total Orders" value={data.total_orders} color="text-sky-600" />
            <Stat label="Low Stock Items" value={data.low_stock_count} color="text-rose-600" />
          </div>

          <Card title={`Low Stock Products (≤ ${data.low_stock_threshold})`}>
            {data.low_stock_products.length === 0 ? (
              <EmptyState message="All products are well stocked. 🎉" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="py-2">Name</th>
                      <th className="py-2">SKU</th>
                      <th className="py-2">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.low_stock_products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 font-medium text-slate-700">{p.name}</td>
                        <td className="py-2 text-slate-500">{p.sku}</td>
                        <td className="py-2">
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                            {p.quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
