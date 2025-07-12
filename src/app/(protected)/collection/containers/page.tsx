'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Plus, ArrowLeft, FolderUp } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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
              <span className="mt-2 text-yellow-600 block">
                Warning: This container has cards in it. Deleting it will move all cards to your "Unorganized Cards" container.
              </span>
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
  const [groupingOrphans, setGroupingOrphans] = useState(false);
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
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // First, find the default container
      const { data: defaultContainer, error: defaultError } = await supabase
        .from('containers')
        .select('id')
        .eq('is_default', true)
        .single();

      if (defaultError) {
        console.error('Error finding default container:', defaultError);
        throw new Error('Could not find default container');
      }

      // Move cards to default container if needed
      if (containerCardCounts[deletingContainer.id] > 0) {
        // First, get all container items for this container
        const { data: containerItems, error: itemsError } = await supabase
          .from('container_items')
          .select('*')
          .eq('container_id', deletingContainer.id);

        if (itemsError) {
          console.error('Error fetching container items:', itemsError);
          throw new Error('Failed to fetch container items');
        }

        // Check for existing items in default container
        const { data: existingItems, error: existingError } = await supabase
          .from('container_items')
          .select('user_card_id, quantity')
          .eq('container_id', defaultContainer.id)
          .in('user_card_id', containerItems?.map(item => item.user_card_id) || []);

        if (existingError) {
          console.error('Error checking existing items:', existingError);
          throw new Error('Failed to check existing items');
        }

        // Prepare upsert data
        const upsertData = containerItems?.map(item => {
          const existing = existingItems?.find(e => e.user_card_id === item.user_card_id);
          return {
            container_id: defaultContainer.id,
            user_card_id: item.user_card_id,
            quantity: (existing?.quantity || 0) + item.quantity
          };
        }) || [];

        // Delete existing items in default container that we'll update
        if (existingItems?.length) {
          const { error: deleteError } = await supabase
            .from('container_items')
            .delete()
            .eq('container_id', defaultContainer.id)
            .in('user_card_id', existingItems.map(item => item.user_card_id));

          if (deleteError) {
            console.error('Error deleting existing items:', deleteError);
            throw new Error('Failed to update existing items');
          }
        }

        // Insert new items into default container
        const { error: insertError } = await supabase
          .from('container_items')
          .insert(upsertData);

        if (insertError) {
          console.error('Error inserting items:', insertError);
          throw new Error('Failed to move cards to default container');
        }
      }

      // Delete the container
      const { error: deleteError } = await supabase
        .from('containers')
        .delete()
        .eq('id', deletingContainer.id);

      if (deleteError) {
        console.error('Error deleting container:', deleteError);
        throw new Error('Failed to delete container');
      }

      // Record the activity
      const { error: activityError } = await supabase
        .from('user_activities')
        .insert([
          {
            user_id: user.id,
            activity_type: 'container_deleted',
            description: `Deleted ${deletingContainer.container_type} container: ${deletingContainer.name}`,
            metadata: {
              container_id: deletingContainer.id,
              container_name: deletingContainer.name,
              container_type: deletingContainer.container_type,
              had_cards: containerCardCounts[deletingContainer.id] > 0,
              cards_moved_to: containerCardCounts[deletingContainer.id] > 0 ? defaultContainer.id : null
            }
          }
        ]);

      if (activityError) {
        console.error('Error recording activity:', activityError);
        // Don't throw here as the main operation succeeded
      }

      setContainers(containers.filter(c => c.id !== deletingContainer.id));
    } catch (err) {
      console.error('Container deletion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete container');
    }
  };

  async function handleGroupOrphans() {
    try {
      setGroupingOrphans(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      // Get or create default container
      let defaultContainerId: string;
      const { data: existingContainer, error: defaultContainerError } = await supabase
        .from('containers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (defaultContainerError) {
        if (defaultContainerError.code === 'PGRST116') {
          // Create default container if it doesn't exist
          const { data: newContainer, error: createError } = await supabase
            .from('containers')
            .insert([{
              user_id: user.id,
              name: 'Unorganized Cards',
              container_type: 'custom',
              description: 'Default container for unorganized cards',
              visibility: 'private',
              is_default: true
            }])
            .select('id')
            .single();

          if (createError) {
            throw new Error(`Failed to create default container: ${createError.message}`);
          }
          if (!newContainer) {
            throw new Error('Failed to create default container: No data returned');
          }
          defaultContainerId = newContainer.id;
        } else {
          throw new Error(`Failed to fetch default container: ${defaultContainerError.message}`);
        }
      } else {
        if (!existingContainer) {
          throw new Error('Failed to fetch default container: No data returned');
        }
        defaultContainerId = existingContainer.id;
      }

      // First get all container items to build exclusion list
      const { data: containerItems, error: containerItemsError } = await supabase
        .from('container_items')
        .select('user_card_id')
        .not('user_card_id', 'is', null);

      if (containerItemsError) {
        throw new Error(`Failed to fetch container items: ${containerItemsError.message}`);
      }

      // Get all user's cards that are not in any container
      const { data: orphanedCards, error: orphanedError } = await supabase
        .from('user_cards')
        .select('id, quantity')
        .eq('user_id', user.id);

      if (orphanedError) {
        throw new Error(`Failed to fetch user cards: ${orphanedError.message}`);
      }
      if (!orphanedCards) {
        throw new Error('Failed to fetch user cards: No data returned');
      }

      // Filter out cards that are already in containers
      const containerCardIds = new Set(containerItems?.map(item => item.user_card_id) || []);
      const trulyOrphanedCards = orphanedCards.filter(card => !containerCardIds.has(card.id));

      if (trulyOrphanedCards.length === 0) {
        toast.info('No orphaned cards found.');
        return;
      }

      // Add orphaned cards to default container
      const { error: insertError } = await supabase
        .from('container_items')
        .insert(
          trulyOrphanedCards.map(card => ({
            container_id: defaultContainerId,
            user_card_id: card.id,
            quantity: card.quantity
          }))
        );

      if (insertError) {
        throw new Error(`Failed to insert orphaned cards: ${insertError.message}`);
      }

      // Refresh container counts
      await fetchContainers();
      toast.success(`Successfully grouped ${trulyOrphanedCards.length} orphaned cards.`);
    } catch (err) {
      console.error('Error grouping orphaned cards:', err);
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setGroupingOrphans(false);
    }
  }

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
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleGroupOrphans}
              disabled={groupingOrphans}
            >
              <FolderUp className="w-4 h-4 mr-2" />
              {groupingOrphans ? 'Grouping...' : 'Group Orphaned Cards'}
            </Button>
            <Link href="/collection/containers/add">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Container
              </Button>
            </Link>
          </div>
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