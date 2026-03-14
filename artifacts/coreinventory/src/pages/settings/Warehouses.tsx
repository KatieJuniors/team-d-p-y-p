import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListWarehouses, useCreateWarehouse, useDeleteWarehouse, useListLocations, useCreateLocation } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Warehouse, MapPin, Plus, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Warehouses() {
  const { data: warehouses, isLoading: whLoading } = useListWarehouses();
  const { mutateAsync: createWarehouse, isPending: isCreatingWh } = useCreateWarehouse();
  const { mutateAsync: deleteWarehouse } = useDeleteWarehouse();
  
  const { mutateAsync: createLocation, isPending: isCreatingLoc } = useCreateLocation();
  
  const [selectedWhId, setSelectedWhId] = useState<number | null>(null);
  const { data: locations } = useListLocations(selectedWhId ? { warehouseId: selectedWhId } : undefined);

  const [isWhOpen, setIsWhOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreateWarehouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createWarehouse({ data: { 
        name: formData.get("name") as string, 
        address: formData.get("address") as string,
        capacity: parseInt(formData.get("capacity") as string) || undefined
      }});
      toast({ title: "Warehouse added" });
      setIsWhOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedWhId) return;
    const formData = new FormData(e.currentTarget);
    try {
      await createLocation({ data: { 
        warehouseId: selectedWhId,
        name: formData.get("name") as string, 
        zone: formData.get("zone") as string,
        rack: formData.get("rack") as string
      }});
      toast({ title: "Location added" });
      (e.target as HTMLFormElement).reset();
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteWh = async (id: number) => {
    if(!confirm("Delete warehouse? All locations must be empty.")) return;
    try {
      await deleteWarehouse({ id });
      toast({ title: "Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    } catch(err:any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Warehouses & Locations</h1>
            <p className="text-muted-foreground mt-1">Manage physical infrastructure</p>
          </div>
          <Dialog open={isWhOpen} onOpenChange={setIsWhOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl">
              <DialogHeader><DialogTitle className="font-display text-2xl">New Warehouse</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateWarehouse} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" required className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="address" className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Capacity (Units)</Label>
                  <Input name="capacity" type="number" className="bg-background/50" />
                </div>
                <Button type="submit" disabled={isCreatingWh} className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-display font-semibold text-lg text-muted-foreground">Select a Warehouse</h3>
            {whLoading ? <p>Loading...</p> : warehouses?.map(wh => (
              <Card 
                key={wh.id} 
                onClick={() => setSelectedWhId(wh.id)}
                className={`p-4 cursor-pointer transition-all border-border/50 hover:border-primary/50 shadow-lg ${selectedWhId === wh.id ? 'ring-2 ring-primary bg-primary/5' : 'bg-card/40'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedWhId === wh.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{wh.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{wh.address || 'No address'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteWh(wh.id); }} className="text-muted-foreground hover:text-destructive h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6 border-border/50 bg-card/40 shadow-xl min-h-[500px]">
              {!selectedWhId ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 min-h-[400px]">
                  <MapPin className="w-16 h-16 mb-4" />
                  <p>Select a warehouse to manage its locations</p>
                </div>
              ) : (
                <div>
                  <h3 className="font-display font-semibold text-xl mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Manage Locations
                  </h3>
                  
                  <form onSubmit={handleCreateLocation} className="flex gap-3 mb-8 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Location Name (e.g. A1)</Label>
                      <Input name="name" required className="bg-background/50 h-9" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Zone (Opt)</Label>
                      <Input name="zone" className="bg-background/50 h-9" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Rack (Opt)</Label>
                      <Input name="rack" className="bg-background/50 h-9" />
                    </div>
                    <Button type="submit" disabled={isCreatingLoc} className="h-9">Add</Button>
                  </form>

                  <div className="border rounded-lg border-border/50 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-muted/30 uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Zone</th>
                          <th className="px-4 py-3 font-medium">Rack</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {locations?.map(loc => (
                          <tr key={loc.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium">{loc.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{loc.zone || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{loc.rack || '—'}</td>
                          </tr>
                        ))}
                        {(!locations || locations.length === 0) && (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No locations defined</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
