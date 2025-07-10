'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';

export default function AddContainerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    container_type: 'deck',
    description: '',
    visibility: 'private'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Create the container
      const { data: container, error } = await supabase
        .from('containers')
        .insert([
          {
            ...formData,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Record the activity
      const { error: activityError } = await supabase
        .from('user_activities')
        .insert([
          {
            user_id: user.id,
            activity_type: 'container_created',
            description: `Created new ${formData.container_type} container: ${formData.name}`,
            metadata: {
              container_id: container.id,
              container_name: formData.name,
              container_type: formData.container_type,
              visibility: formData.visibility
            }
          }
        ]);

      if (activityError) {
        console.error('Error recording activity:', activityError);
        // Don't throw here as the main operation succeeded
      }

      router.push('/collection/containers');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create container');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Add New Container</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
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

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Container'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
} 