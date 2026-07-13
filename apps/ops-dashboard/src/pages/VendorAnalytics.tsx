import React, { useEffect, useState } from 'react';
import { useOpsStore } from '../store/opsStore';
import { dashboardService, Vendor, VendorAnalytics as VendorAnalyticsData, ProductAnalytics } from '../services/dashboard';

export const VendorAnalytics: React.FC = () => {
  const store = useOpsStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [analytics, setAnalytics] = useState<VendorAnalyticsData | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [vendorList, lowStock, products] = await Promise.all([
          dashboardService.getVendors(),
          dashboardService.getLowStockInventory(),
          dashboardService.getProductAnalytics(),
        ]);
        setVendors(vendorList);
        store.setInventories(lowStock);
        setProductAnalytics(products);
        if (vendorList.length > 0) {
          setSelectedVendor(vendorList[0].id);
          const va = await dashboardService.getVendorAnalytics(vendorList[0].id);
          setAnalytics(va);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;
    dashboardService.getVendorAnalytics(selectedVendor).then(setAnalytics).catch(() => setAnalytics(null));
  }, [selectedVendor]);

  const filteredInvs = store.inventories.filter(
    (inv) =>
      inv.vendor_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.product_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#94A3B8] text-sm">Loading vendor data...</div>;
  }

  return (
    <div className="p-8 text-[#F8FAFC] space-y-8 font-sans selection:bg-[#00A8FF]/20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">Vendor Operations & Analytics</h1>
          <p className="text-[#94A3B8] text-xs mt-1">Live data from /api/v1/vendors</p>
        </div>
        {vendors.length > 0 && (
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="bg-[#111A33] border border-white/10 px-4 py-2 rounded-xl text-xs outline-none text-white"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Revenue</span>
          <div className="text-xl font-extrabold text-[#22C55E] font-display">
            {analytics ? `$${analytics.revenue_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Net Profit</span>
          <div className="text-xl font-extrabold text-[#00A8FF] font-display">
            {analytics ? `$${analytics.net_profit_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Hourly Sales Avg</span>
          <div className="text-xl font-extrabold text-[#8B5CF6] font-display">
            {productAnalytics ? `$${productAnalytics.hourly_sales_average_usd.toFixed(2)}` : '—'}
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-28 border border-white/5">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Low Stock Alerts</span>
          <div className="text-xl font-extrabold text-[#EF4444] font-display">{store.inventories.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-base font-bold text-white tracking-wider">Vendor Performance</h3>
          <p className="text-[#94A3B8] text-xs mt-0.5">Selected vendor analytics</p>
          {analytics ? (
            <div className="mt-6 space-y-3 text-xs">
              <div className="flex justify-between p-3 bg-[#111A33] rounded-xl border border-white/5">
                <span className="text-gray-400">Units Sold</span>
                <span className="font-bold text-white">{analytics.sales_volume_units.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-[#111A33] rounded-xl border border-white/5">
                <span className="text-gray-400">Cost</span>
                <span className="font-bold text-white">${analytics.cost_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-[#111A33] rounded-xl border border-white/5">
                <span className="text-gray-400">Top Category</span>
                <span className="font-bold text-white">{productAnalytics?.most_purchased_category || '—'}</span>
              </div>
              <div className="flex justify-between p-3 bg-[#111A33] rounded-xl border border-white/5">
                <span className="text-gray-400">Demand Spike Forecast</span>
                <span className="font-bold text-white">{productAnalytics?.predicted_demand_spike_time || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-[#94A3B8] text-xs">No vendors registered yet.</div>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-base font-bold text-white tracking-wider">Popular Products</h3>
          <p className="text-[#94A3B8] text-xs mt-0.5">From vendor analytics API</p>
          <div className="mt-6 space-y-3">
            {analytics && analytics.popular_products.length > 0 ? (
              analytics.popular_products.map((product, idx) => (
                <div key={idx} className="p-4 bg-[#111A33] border border-white/5 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{product}</span>
                  <span className="text-[9px] text-[#00E5FF] font-bold uppercase">Top Seller</span>
                </div>
              ))
            ) : (
              <div className="text-[#94A3B8] text-xs">No product data available.</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 space-y-3 md:space-y-0">
          <div>
            <h3 className="text-base font-bold text-[#EF4444] tracking-wider">Low Stock Alerts</h3>
            <p className="text-[#94A3B8] text-xs mt-0.5">From /api/v1/vendors/inventory/low-stock</p>
          </div>
          <input
            type="text"
            placeholder="Filter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#111A33] border border-white/10 px-4 py-2 rounded-xl text-xs outline-none text-white w-full md:w-64"
          />
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[#94A3B8] border-b border-white/5">
                <th className="py-3 px-4 font-bold uppercase">Vendor</th>
                <th className="py-3 px-4 font-bold uppercase">Product</th>
                <th className="py-3 px-4 font-bold uppercase">Stock</th>
                <th className="py-3 px-4 font-bold uppercase">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvs.length > 0 ? (
                filteredInvs.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/5">
                    <td className="py-4 px-4 font-semibold text-white">{inv.vendor_id.slice(0, 12)}</td>
                    <td className="py-4 px-4 font-mono text-[#00A8FF]">{inv.product_id.slice(0, 12)}</td>
                    <td className="py-4 px-4 font-bold text-[#EF4444]">{inv.current_stock}</td>
                    <td className="py-4 px-4 text-gray-400">{inv.min_threshold}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">No low-stock items.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default VendorAnalytics;
