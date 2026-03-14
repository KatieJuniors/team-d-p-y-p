import { useGetDashboardStats, useGetStockDistribution, useGetRecentOperations, useGetLowStockItems } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { 
  Package, AlertTriangle, XCircle, ArrowDownToLine, 
  ArrowUpFromLine, ArrowRightLeft, TrendingUp 
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats();
  const { data: distribution } = useGetStockDistribution();
  const { data: recentOps } = useGetRecentOperations();
  const { data: lowStock } = useGetLowStockItems();

  const kpis = [
    { label: "Total Products", value: stats?.totalProducts || 0, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Low Stock", value: stats?.lowStockItems || 0, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Out of Stock", value: stats?.outOfStockItems || 0, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Pending Receipts", value: stats?.pendingReceipts || 0, icon: ArrowDownToLine, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending Deliveries", value: stats?.pendingDeliveries || 0, icon: ArrowUpFromLine, color: "text-primary", bg: "bg-primary/10" },
    { label: "Scheduled Transfers", value: stats?.scheduledTransfers || 0, icon: ArrowRightLeft, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your inventory</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 border-border/50 bg-card/40 hover:bg-card/60 transition-colors shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <h3 className="text-3xl font-display font-bold mt-2">{kpi.value}</h3>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="col-span-1 lg:col-span-2 p-6 border-border/50 bg-card/40 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold font-display text-lg">Stock Distribution by Category</h3>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="h-[300px] w-full">
              {distribution && distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="category" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary))`}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="col-span-1 p-0 overflow-hidden border-border/50 bg-card/40 shadow-lg shadow-black/20 flex flex-col">
            <div className="p-6 border-b border-border/50 bg-amber-500/5">
              <h3 className="font-semibold font-display text-lg flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
                Action Required
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Items below reorder threshold</p>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px] p-2">
              {lowStock && lowStock.length > 0 ? (
                <div className="space-y-1">
                  {lowStock.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-500">{item.currentStock}</p>
                        <p className="text-xs text-muted-foreground">Min: {item.reorderThreshold}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                  <Package className="w-8 h-8 mb-2 opacity-20" />
                  <p>All stock levels look healthy</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Operations */}
        <Card className="p-0 overflow-hidden border-border/50 bg-card/40 shadow-lg shadow-black/20">
          <div className="p-6 border-b border-border/50 flex justify-between items-center">
            <h3 className="font-semibold font-display text-lg">Recent Operations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/30 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Qty</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentOps?.map((op) => (
                  <tr key={op.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize
                        ${op.operationType === 'receipt' ? 'bg-emerald-500/10 text-emerald-500' : 
                          op.operationType === 'delivery' ? 'bg-blue-500/10 text-blue-500' :
                          op.operationType === 'transfer' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-amber-500/10 text-amber-500'}`}>
                        {op.operationType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{op.referenceDoc}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{op.productName}</p>
                      <p className="text-muted-foreground text-xs">{op.sku}</p>
                    </td>
                    <td className="px-6 py-4 font-bold">{op.quantity > 0 ? `+${op.quantity}` : op.quantity}</td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(op.timestamp), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-6 py-4">{op.userName || 'System'}</td>
                  </tr>
                ))}
                {(!recentOps || recentOps.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No recent operations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
