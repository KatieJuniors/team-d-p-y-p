import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListReceipts, useCreateReceipt, useValidateReceipt, useListProducts, useListWarehouses, CreateReceiptRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowDownToLine, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Receipts() {
  const { data: receipts, isLoading } = useListReceipts();
  const { data: products } = useListProducts();
  const { data: warehouses } = useListWarehouses();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [items, setItems] = useState<{productId: string, quantity: string}[]>([{ productId: "", quantity: "1" }]);
  
  const { mutateAsync: createReceipt, isPending: isCreating } = useCreateReceipt();
  const { mutateAsync: validateReceipt } = useValidateReceipt();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const validItems = items.filter(i => i.productId && parseInt(i.quantity) > 0).map(i => ({
      productId: parseInt(i.productId),
      quantity: parseInt(i.quantity)
    }));

    if (validItems.length === 0) {
      toast({ title: "Error", description: "Add at least one valid item", variant: "destructive" });
      return;
    }

    const payload: CreateReceiptRequest = {
      supplier: formData.get("supplier") as string,
      warehouseId: parseInt(formData.get("warehouseId") as string),
      notes: formData.get("notes") as string,
      items: validItems
    };

    try {
      await createReceipt({ data: payload });
      toast({ title: "Receipt drafted successfully" });
      setIsCreateOpen(false);
      setItems([{ productId: "", quantity: "1" }]);
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
    } catch (err: any) {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    }
  };

  const handleValidate = async (id: number) => {
    if (!confirm("Validating this receipt will increase stock permanently. Proceed?")) return;
    try {
      await validateReceipt({ id });
      toast({ title: "Receipt validated. Stock updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
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
            <h1 className="text-3xl font-display font-bold text-foreground">Incoming Receipts</h1>
            <p className="text-muted-foreground mt-1">Receive goods from suppliers into warehouses</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] border-border/50 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display flex items-center gap-2">
                  <ArrowDownToLine className="w-6 h-6 text-primary" />
                  Draft New Receipt
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier Name *</Label>
                    <Input id="supplier" name="supplier" required className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warehouseId">Destination Warehouse *</Label>
                    <Select name="warehouseId" required>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Items Received</Label>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1">
                        <Select 
                          value={item.productId} 
                          onValueChange={(val) => {
                            const newItems = [...items];
                            newItems[idx].productId = val;
                            setItems(newItems);
                          }}
                        >
                          <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {products?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sku})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].quantity = e.target.value;
                            setItems(newItems);
                          }}
                          className="bg-background/50"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { productId: "", quantity: "1" }])} className="mt-2">
                    <Plus className="w-4 h-4 mr-2" /> Add Item Line
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" placeholder="Delivery slip #, remarks..." className="bg-background/50" />
                </div>

                <Button type="submit" disabled={isCreating} className="w-full h-12">
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
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Supplier</th>
                <th className="px-6 py-4 font-medium">Warehouse</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : receipts?.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium">{receipt.referenceNo}</td>
                  <td className="px-6 py-4">{receipt.supplier}</td>
                  <td className="px-6 py-4 text-muted-foreground">{receipt.warehouseName}</td>
                  <td className="px-6 py-4 text-muted-foreground">{format(new Date(receipt.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${receipt.status === 'done' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        receipt.status === 'draft' ? 'bg-muted text-muted-foreground border-border' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                      {receipt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {receipt.status === 'draft' && (
                      <Button variant="default" size="sm" onClick={() => handleValidate(receipt.id)} className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Validate
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
