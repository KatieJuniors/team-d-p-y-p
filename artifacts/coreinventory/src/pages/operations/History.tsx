import { AppLayout } from "@/components/layout/AppLayout";
import { useListLedger } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { History as HistoryIcon } from "lucide-react";

export default function History() {
  const { data: ledger, isLoading } = useListLedger({ limit: 100 });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Stock Ledger</h1>
          <p className="text-muted-foreground mt-1">Immutable history of all inventory movements</p>
        </div>

        <Card className="p-0 border-border/50 bg-card/40 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/30 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Operation</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium text-right">Movement</th>
                  <th className="px-6 py-4 font-medium">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
                ) : ledger?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No ledger entries found.</p>
                    </td>
                  </tr>
                ) : ledger?.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize
                        ${entry.operationType === 'receipt' ? 'bg-emerald-500/10 text-emerald-500' : 
                          entry.operationType === 'delivery' ? 'bg-blue-500/10 text-blue-500' :
                          entry.operationType === 'transfer' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-amber-500/10 text-amber-500'}`}>
                        {entry.operationType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-xs">{entry.referenceDoc}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{entry.productName}</div>
                      <div className="text-xs text-muted-foreground">{entry.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold font-mono text-base ${entry.quantity > 0 ? 'text-emerald-500' : entry.quantity < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{entry.userName || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
