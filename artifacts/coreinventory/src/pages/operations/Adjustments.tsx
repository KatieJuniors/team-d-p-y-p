import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListAdjustments, useCreateAdjustment, useValidateAdjustment, useListProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scale, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Adjustments() {
  const { data: adjustments, isLoading } = useListAdjustments();
  const { data: products } = useListProducts();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [actualQty, setActualQty] = useState<string>("");
  
  const { mutateAsync: createAdjustment, isPending: isCreating } = useCreateAdjustment();
  const { mutateAsync: validateAdjustment } = useValidateAdjustment();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedProduct = products?.find(p => p.id.toString() === selectedProductId);
  const difference = selectedProduct && actualQty ? parseInt(actualQty) - selectedProduct.currentStock : 0;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedProductId || !actualQty) return;

    try {
      await createAdjustment({ data: {
        productId: parseInt(selectedProductId),
        actualQuantity: parseInt(actualQty),
        reason: formData.get("reason") as string,
        locationId: selectedProduct?.locationId
      }});
      toast({ title: "Adjustment drafted" });
      setIsCreateOpen(false);
      setSelectedProductId("");
      setActualQty("");
      queryClient.invalidateQueries({ queryKey: ["/api/adjustments"] });
    } catch (err: any) {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    }
  };

  const handleValidate = async (id: number) => {
    if (!confirm("This will permanently overwrite the system stock. Proceed?")) return;
    try {
      await validateAdjustment({ id });
      toast({ title: "Adjustment applied. Stock synced." });
      queryClient.invalidateQueries({ queryKey: ["/api/adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    } catch (err: any) {
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Inventory Adjustments</h1>
            <p className="text-muted-foreground mt-1">Reconcile physical counts with system stock</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Adjustment
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display flex items-center gap-2">
                  <Scale className="w-6 h-6 text-primary" />
                  Stock Take / Adjustment
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label>Product to Count</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} (SKU: {p.sku})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedProduct && (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 border border-border/50 rounded-xl">
                    <div>
                      <Label className="text-xs text-muted-foreground block mb-1">System Stock</Label>
                      <div className="font-mono text-xl font-medium">{selectedProduct.currentStock}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground block mb-1">Actual Count *</Label>
                      <Input 
                        type="number" 
                        min="0"
                        value={actualQty}
                        onChange={e => setActualQty(e.target.value)}
                        required
                        className="bg-background/50 font-mono text-lg h-10" 
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground block mb-1">Difference</Label>
                      <div className={`font-mono text-xl font-bold ${difference > 0 ? 'text-emerald-500' : difference < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {difference > 0 ? `+${difference}` : difference}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input name="reason" placeholder="e.g. Damaged goods, count mismatch" className="bg-background/50" />
                </div>

                <Button type="submit" disabled={isCreating || !selectedProduct} className="w-full h-12">
                  {isCreating ? "Saving..." : "Create Draft"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-0 border-border/50 bg-card/40 shadow-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/30 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Ref</th>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium text-center">System</th>
                <th className="px-6 py-4 font-medium text-center">Actual</th>
                <th className="px-6 py-4 font-medium text-center">Diff</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : adjustments?.map((adj) => (
                <tr key={adj.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{adj.referenceNo}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{adj.productName}</p>
                    <p className="text-xs text-muted-foreground">{adj.reason}</p>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-muted-foreground">{adj.recordedQuantity}</td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-primary">{adj.actualQuantity}</td>
                  <td className="px-6 py-4 text-center font-mono">
                    <span className={adj.difference > 0 ? 'text-emerald-500' : adj.difference < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                      {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${adj.status === 'done' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        'bg-muted text-muted-foreground border-border'}`}>
                      {adj.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {adj.status === 'draft' && (
                      <Button variant="default" size="sm" onClick={() => handleValidate(adj.id)} className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Apply
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AppLayout>
  );
}
