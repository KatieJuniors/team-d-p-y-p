import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListDeliveries, useCreateDelivery, useValidateDelivery, useListProducts, useListWarehouses, CreateDeliveryRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpFromLine, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Deliveries() {
  const { data: deliveries, isLoading } = useListDeliveries();
  const { data: products } = useListProducts();
  const { data: warehouses } = useListWarehouses();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [items, setItems] = useState<{productId: string, quantity: string}[]>([{ productId: "", quantity: "1" }]);
  
  const { mutateAsync: createDelivery, isPending: isCreating } = useCreateDelivery();
  const { mutateAsync: validateDelivery } = useValidateDelivery();
  
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

    const payload: CreateDeliveryRequest = {
      customer: formData.get("customer") as string,
      warehouseId: parseInt(formData.get("warehouseId") as string),
      notes: formData.get("notes") as string,
      items: validItems
    };

    try {
      await createDelivery({ data: payload });
      toast({ title: "Delivery order drafted" });
      setIsCreateOpen(false);
      setItems([{ productId: "", quantity: "1" }]);
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
    } catch (err: any) {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    }
  };

  const handleValidate = async (id: number) => {
    if (!confirm("Validating will DECREASE stock for these items permanently. Proceed?")) return;
    try {
      await validateDelivery({ id });
      toast({ title: "Delivery validated. Stock updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
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
            <h1 className="text-3xl font-display font-bold text-foreground">Delivery Orders</h1>
            <p className="text-muted-foreground mt-1">Send goods out to customers</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] border-border/50 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display flex items-center gap-2">
                  <ArrowUpFromLine className="w-6 h-6 text-primary" />
                  Draft Delivery Order
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer Name *</Label>
                    <Input id="customer" name="customer" required className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warehouseId">Source Warehouse *</Label>
                    <Select name="warehouseId" required>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Items to Deliver</Label>
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
                            {products?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} (Stock: {p.currentStock})</SelectItem>)}
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
                  <Label htmlFor="notes">Notes / Tracking #</Label>
                  <Input id="notes" name="notes" className="bg-background/50" />
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
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Warehouse</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : deliveries?.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium">{delivery.referenceNo}</td>
                  <td className="px-6 py-4">{delivery.customer}</td>
                  <td className="px-6 py-4 text-muted-foreground">{delivery.warehouseName}</td>
                  <td className="px-6 py-4 text-muted-foreground">{format(new Date(delivery.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${delivery.status === 'done' ? 'bg-primary/10 text-primary border-primary/20' : 
                        delivery.status === 'draft' ? 'bg-muted text-muted-foreground border-border' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {delivery.status === 'draft' && (
                      <Button variant="default" size="sm" onClick={() => handleValidate(delivery.id)} className="bg-primary/10 text-primary hover:bg-primary/20">
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
