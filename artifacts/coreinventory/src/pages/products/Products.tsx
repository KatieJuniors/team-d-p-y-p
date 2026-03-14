import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListProducts, useCreateProduct, useListCategories, useListWarehouses, useListLocations, CreateProductRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Products() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useListProducts({ search });
  const { data: categories } = useListCategories();
  const { data: warehouses } = useListWarehouses();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const { data: locations } = useListLocations(selectedWarehouse ? { warehouseId: parseInt(selectedWarehouse) } : undefined);

  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload: CreateProductRequest = {
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      unitOfMeasure: formData.get("unitOfMeasure") as string,
      categoryId: parseInt(formData.get("categoryId") as string) || undefined,
      warehouseId: parseInt(formData.get("warehouseId") as string) || undefined,
      locationId: parseInt(formData.get("locationId") as string) || undefined,
      initialStock: parseInt(formData.get("initialStock") as string) || 0,
      reorderThreshold: parseInt(formData.get("reorderThreshold") as string) || 10,
    };

    try {
      await createProduct({ data: payload });
      toast({ title: "Product created successfully" });
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    } catch (err: any) {
      toast({ title: "Failed to create product", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground mt-1">Manage your product catalog and stock levels</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-border/50 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Create New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input id="name" name="name" required className="bg-background/50" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input id="sku" name="sku" required className="bg-background/50 font-mono" />
                </div>
                
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select name="categoryId">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="unitOfMeasure">Unit of Measure *</Label>
                  <Select name="unitOfMeasure" defaultValue="pcs">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="l">Liters (L)</SelectItem>
                      <SelectItem value="box">Boxes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="initialStock">Initial Stock</Label>
                  <Input id="initialStock" name="initialStock" type="number" defaultValue="0" min="0" className="bg-background/50" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
                  <Input id="reorderThreshold" name="reorderThreshold" type="number" defaultValue="10" min="0" className="bg-background/50" />
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="warehouseId">Default Warehouse</Label>
                  <Select name="warehouseId" onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="locationId">Default Location</Label>
                  <Select name="locationId" disabled={!selectedWarehouse}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder={selectedWarehouse ? "Select location" : "Select warehouse first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 mt-4">
                  <Button type="submit" disabled={isCreating} className="w-full h-12 text-md shadow-lg shadow-primary/20">
                    {isCreating ? "Creating..." : "Save Product"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-0 border-border/50 bg-card/40 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or SKU..." 
                className="pl-9 bg-background/50 border-border/50 max-w-md"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/30 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Stock Level</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center">Loading...</td></tr>
                ) : products?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No products found matching your search.</p>
                    </td>
                  </tr>
                ) : products?.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {product.warehouseName} {product.locationName ? `• ${product.locationName}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{product.sku}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.categoryName || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{product.currentStock}</span>
                        <span className="text-xs text-muted-foreground">{product.unitOfMeasure}</span>
                        {product.currentStock <= product.reorderThreshold && (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                        ${product.stockStatus === 'in_stock' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          product.stockStatus === 'low_stock' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        {product.stockStatus.replace('_', ' ')}
                      </span>
                    </td>
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
