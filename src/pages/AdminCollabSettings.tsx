import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Save, RotateCcw } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-helper';

const API_BASE = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';

interface CollabSettings {
  collab_request_limit: number;
  default_limit: number;
}

export function AdminCollabSettings() {
  const [settings, setSettings] = useState<CollabSettings | null>(null);
  const [newLimit, setNewLimit] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`${API_BASE}/collab-requests/admin/settings`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
      setNewLimit(data.collab_request_limit.toString());
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collaboration settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const limit = parseInt(newLimit);

    if (isNaN(limit) || limit < 1) {
      toast({
        title: 'Invalid Value',
        description: 'Please enter a positive number',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const response = await authenticatedFetch(`${API_BASE}/collab-requests/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collab_request_limit: limit })
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      
      toast({
        title: 'Success',
        description: 'Collaboration request limit updated successfully'
      });

      // Refresh settings
      await fetchSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update collaboration request limit',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setNewLimit(settings.collab_request_limit.toString());
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Collaboration Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure collaboration request limits for regular users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Request Limit</CardTitle>
          <CardDescription>
            Set how many collaboration requests regular users (non-artists) can create per month.
            Artists have unlimited requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="limit">
              Requests per month for regular users
            </Label>
            <Input
              id="limit"
              type="number"
              min="1"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="Enter a positive number"
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Current setting: <strong>{settings?.collab_request_limit}</strong> requests/month
              {settings && settings.collab_request_limit === settings.default_limit && (
                <span className="ml-2">(Default)</span>
              )}
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Note:</strong> This limit only applies to regular users. Artists associated 
              with an artist profile have unlimited collaboration requests. The limit resets on 
              the 1st of each month.
            </AlertDescription>
          </Alert>

          {settings && settings.collab_request_limit !== parseInt(newLimit) && (
            <Alert>
              <AlertDescription className="text-orange-600 dark:text-orange-400">
                <strong>Unsaved changes!</strong> Click "Save Changes" to apply the new limit.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || settings?.collab_request_limit === parseInt(newLimit)}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || settings?.collab_request_limit === parseInt(newLimit)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Regular users can create up to the configured number of requests per calendar month</li>
              <li>The limit resets automatically on the 1st day of each month</li>
              <li>Artists (users with an associated artist profile) have unlimited requests</li>
              <li>This helps prevent spam while allowing legitimate collaboration opportunities</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Recommended settings:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>2-3 requests/month</strong>: Conservative, prevents spam</li>
              <li><strong>5-10 requests/month</strong>: Balanced, allows active users to engage</li>
              <li><strong>10+ requests/month</strong>: Liberal, encourages maximum participation</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
