'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Container {
  id: string;
  name: string;
  container_type: string;
  description: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
}

interface EditDialogProps {
  container: Container | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (container: Partial<Container>) => Promise<void>;
}

function EditDialog({ container, open, onOpenChange, onSave }: EditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    container_type: 'deck',
    description: '',
    visibility: 'private'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (container) {
      setFormData({
        name: container.name,
        container_type: container.container_type,
        description: container.description || '',
        visibility: container.visibility
      });
    }
  }, [container]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Container</DialogTitle>
          <DialogDescription>
            Update the container details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Container Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="container_type">Type</Label>
            <Select
              value={formData.container_type}
              onValueChange={(value) => setFormData({ ...formData, container_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deck">Deck</SelectItem>
                <SelectItem value="binder">Binder</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value) => setFormData({ ...formData, visibility: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  container: Container | null;
  hasCards: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

function DeleteDialog({ container, hasCards, open, onOpenChange, onConfirm }: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Container</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{container?.name}"?
            {hasCards && (
              <p className="mt-2 text-yellow-600">
                Warning: This container has cards in it. Deleting it will move all cards to your "Unorganized Cards" container.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Container'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [deletingContainer, setDeletingContainer] = useState<Container | null>(null);
  const [containerCardCounts, setContainerCardCounts] = useState<Record<string, number>>({});
  const supabase = createClient();

  useEffect(() => {
    fetchContainers();
  }, []);

  async function fetchContainers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('containers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContainers(data || []);

      // Fetch card counts for each container
      const counts: Record<string, number> = {};
      for (const container of data || []) {
        const { count, error: countError } = await supabase
          .from('container_items')
          .select('*', { count: 'exact' })
          .eq('container_id', container.id);
        
        if (!countError) {
          counts[container.id] = count || 0;
        }
      }
      setContainerCardCounts(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch containers');
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = async (updates: Partial<Container>) => {
    if (!editingContainer) return;

    try {
      const { error } = await supabase
        .from('containers')
        .update(updates)
        .eq('id', editingContainer.id);

      if (error) throw error;

      setContainers(containers.map(container =>
        container.id === editingContainer.id
          ? { ...container, ...updates }
          : container
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update container');
    }
  };

  const handleDelete = async () => {
    if (!deletingContainer) return;

    try {
      // First, find the default container
      const { data: defaultContainer, error: defaultError } = await supabase
        .from('containers')
        .select('id')
        .eq('is_default', true)
        .single();

      if (defaultError) throw defaultError;

      // Move cards to default container
      if (containerCardCounts[deletingContainer.id] > 0) {
        const { error: updateError } = await supabase
          .from('container_items')
          .update({ container_id: defaultContainer.id })
          .eq('container_id', deletingContainer.id);

        if (updateError) throw updateError;
      }

      // Delete the container
      const { error: deleteError } = await supabase
        .from('containers')
        .delete()
        .eq('id', deletingContainer.id);

      if (deleteError) throw deleteError;

      setContainers(containers.filter(c => c.id !== deletingContainer.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete container');
    }
  };

  if (loading) {
    return <div className="p-8">Loading containers...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link 
          href="/collection" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Collection
        </Link>
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Manage Containers</h1>
          <Link href="/collection/containers/add">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Container
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {containers.map((container) => (
          <Card key={container.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{container.name}</h2>
                <p className="text-sm text-gray-500">{container.container_type}</p>
                {container.description && (
                  <p className="mt-2 text-sm">{container.description}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  {containerCardCounts[container.id] || 0} cards
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingContainer(container)}
                >
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setDeletingContainer(container)}
                >
                  Delete
                </Button>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <span className="capitalize">Visibility: {container.visibility}</span>
            </div>
          </Card>
        ))}
      </div>

      <EditDialog
        container={editingContainer}
        open={!!editingContainer}
        onOpenChange={(open) => !open && setEditingContainer(null)}
        onSave={handleEdit}
      />

      <DeleteDialog
        container={deletingContainer}
        hasCards={deletingContainer ? (containerCardCounts[deletingContainer.id] || 0) > 0 : false}
        open={!!deletingContainer}
        onOpenChange={(open) => !open && setDeletingContainer(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
} 