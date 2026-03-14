import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTransfers, useCreateTransfer, useValidateTransfer, useListProducts, useListLocations, CreateTransferRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRightLeft, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Transfers() {
  const { data: transfers, isLoading } = useListTransfers();
  const { data: products } = useListProducts();
  const { data: locations } = useListLocations(); // Assuming flat locations across warehouses for simplicity in this view
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [items, setItems] = useState<{productId: string, quantity: string}[]>([{ productId: "", quantity: "1" }]);
  
  const { mutateAsync: createTransfer, isPending: isCreating } = useCreateTransfer();
  const { mutateAsync: validateTransfer } = useValidateTransfer();
  
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

    const payload: CreateTransferRequest = {
      sourceLocationId: parseInt(formData.get("sourceLocationId") as string),
      destinationLocationId: parseInt(formData.get("destinationLocationId") as string),
      notes: formData.get("notes") as string,
      items: validItems
    };

    if(payload.sourceLocationId === payload.destinationLocationId) {
      toast({ title: "Error", description: "Source and destination must be different", variant: "destructive" });
      return;
    }

    try {
      await createTransfer({ data: payload });
      toast({ title: "Transfer drafted" });
      setIsCreateOpen(false);
      setItems([{ productId: "", quantity: "1" }]);
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
    } catch (err: any) {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    }
  };

  const handleValidate = async (id: number) => {
    if (!confirm("Validate and move stock?")) return;
    try {
      await validateTransfer({ id });
      toast({ title: "Stock transfer complete" });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (err: any) {
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Internal Transfers</h1>
            <p className="text-muted-foreground mt-1">Move stock between warehouses or bins</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] border-border/50 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display flex items-center gap-2">
                  <ArrowRightLeft className="w-6 h-6 text-primary" />
                  Draft Transfer
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Location *</Label>
                    <Select name="sourceLocationId" required>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>
                        {locations?.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To Location *</Label>
                    <Select name="destinationLocationId" required>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="Destination" /></SelectTrigger>
                      <SelectContent>
                        {locations?.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Items to Move</Label>
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
                            {products?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input 
                          type="number" min="1" value={item.quantity} 
                          onChange={(e) => { const newItems = [...items]; newItems[idx].quantity = e.target.value; setItems(newItems); }}
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
                  <Label>Notes</Label>
                  <Input name="notes" className="bg-background/50" />
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
                <th className="px-6 py-4 font-medium">From → To</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : transfers?.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium">{tx.referenceNo}</td>
                  <td className="px-6 py-4 font-medium text-muted-foreground">
                    <span className="text-foreground">{tx.sourceLocationName}</span> 
                    <ArrowRightLeft className="inline w-3 h-3 mx-2 text-muted-foreground" /> 
                    <span className="text-foreground">{tx.destinationLocationName}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{format(new Date(tx.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${tx.status === 'done' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 
                        tx.status === 'draft' ? 'bg-muted text-muted-foreground border-border' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.status === 'draft' && (
                      <Button variant="default" size="sm" onClick={() => handleValidate(tx.id)} className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20">
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
