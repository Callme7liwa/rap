import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Save, RotateCcw } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

interface CollabSettings {
  monthly_limit: number;
  default_limit?: number;
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
      const data = await apiRequest<CollabSettings>('/collab-requests/admin/settings');
      setSettings(data);
      setNewLimit(data.monthly_limit.toString());
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
      await apiRequest<CollabSettings>('/collab-requests/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ monthly_limit: limit })
      });
      
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
      setNewLimit(settings.monthly_limit.toString());
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
          Configure collaboration request limits for all users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Request Limit</CardTitle>
          <CardDescription>
            Set how many collaboration requests users can create per month.
            The backend applies this quota to every user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="limit">
              Requests per month
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
              Current setting: <strong>{settings?.monthly_limit}</strong> requests/month
              {settings && settings.monthly_limit === (settings.default_limit ?? 3) && (
                <span className="ml-2">(Default)</span>
              )}
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Note:</strong> This limit applies to all users, including artists. The limit
              resets on the 1st of each month.
            </AlertDescription>
          </Alert>

          {settings && settings.monthly_limit !== parseInt(newLimit) && (
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
            disabled={saving || settings?.monthly_limit === parseInt(newLimit)}
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
            disabled={saving || settings?.monthly_limit === parseInt(newLimit)}
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
              <li>Artists follow the same monthly quota as other users</li>
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
