import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { fetchAuthSession } from 'aws-amplify/auth';
import { 
  Upload, 
  Trash2, 
  RefreshCw, 
  Image as ImageIcon, 
  Download,
  AlertCircle,
  Check,
  Clock,
  Calendar
} from 'lucide-react';

interface S3Image {
  key: string;
  size: number;
  lastModified: string;
  url: string;
}

interface UploadedRecord {
  image_id: string;
  image_key: string;
  instagram_post_id: string;
  uploaded_at: string;
  trigger_time: string;
  status: string;
}

export default function S3ImageManager() {
  const [images, setImages] = useState<S3Image[]>([]);
  const [uploadedRecords, setUploadedRecords] = useState<UploadedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Configuration - à remplacer par vos vraies valeurs
  const S3_BUCKET = import.meta.env.VITE_S3_BUCKET_NAME || 'lyricscape-lyrics-images-prod';
  const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';

  useEffect(() => {
    loadImages();
    loadUploadedRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (!token) {
        toast.error('Please sign in to view images');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_ENDPOINT}/s3/images`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to load images');
      
      const data = await response.json();
      setImages(data.images || []);
      toast.success(`${data.images?.length || 0} images loaded`);
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error('Failed to load images from S3');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUploadedRecords = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (!token) return;

      const response = await fetch(`${API_ENDPOINT}/dynamodb/records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to load records');
      
      const data = await response.json();
      setUploadedRecords(data.records || []);
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const uploadImages = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select images to upload');
      return;
    }

    setUploading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (!token) {
        toast.error('Please sign in to upload images');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      Array.from(selectedFiles).forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_ENDPOINT}/s3/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      toast.success(`${data.uploaded} image(s) uploaded successfully`);
      
      setSelectedFiles(null);
      // Reset input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      loadImages();
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (key: string) => {
    if (!confirm(`Delete ${key}?`)) return;

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (!token) {
        toast.error('Please sign in to delete images');
        return;
      }

      const response = await fetch(`${API_ENDPOINT}/s3/delete`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ key })
      });

      if (!response.ok) throw new Error('Delete failed');

      toast.success('Image deleted');
      loadImages();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete image');
    }
  };

  const downloadImage = async (image: S3Image) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.key;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Failed to download image');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getNextScheduledPosts = () => {
    const now = new Date();
    const times = [];
    
    // Morning post (9 AM)
    const morning = new Date(now);
    morning.setHours(9, 0, 0, 0);
    if (morning < now) morning.setDate(morning.getDate() + 1);
    
    // Evening post (6 PM)
    const evening = new Date(now);
    evening.setHours(18, 0, 0, 0);
    if (evening < now) evening.setDate(evening.getDate() + 1);
    
    times.push(morning, evening);
    times.sort((a, b) => a.getTime() - b.getTime());
    
    return times.slice(0, 2);
  };

  const nextPosts = getNextScheduledPosts();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">S3 Image Manager</h1>
        <p className="text-muted-foreground">
          Manage images for automated Instagram posting
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Images in Queue</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready to post
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadedRecords.length}</div>
            <p className="text-xs text-muted-foreground">
              Total uploaded to Instagram
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Post</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {nextPosts[0]?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <p className="text-xs text-muted-foreground">
              {nextPosts[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Schedule</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">9 AM & 6 PM</div>
            <p className="text-xs text-muted-foreground">
              Daily automatic posts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Images</CardTitle>
          <CardDescription>
            Upload lyrics card images to S3 for automated Instagram posting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              id="file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              onChange={handleFileSelect}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button
                onClick={uploadImages}
                disabled={uploading || !selectedFiles}
                className="whitespace-nowrap"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={loadImages}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {selectedFiles && selectedFiles.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedFiles.length} file(s) selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alert if no images */}
      {images.length === 0 && !loading && (
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No images in the queue. Upload some images to start automated posting.
          </AlertDescription>
        </Alert>
      )}

      {/* Images Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Current Images ({images.length})</CardTitle>
          <CardDescription>
            Images waiting to be posted to Instagram
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((image) => (
                <Card key={image.key} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    <img
                      src={image.url}
                      alt={image.key}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-2">
                      <p className="text-sm font-medium truncate" title={image.key}>
                        {image.key}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(image.size)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {formatDate(image.lastModified)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadImage(image)}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteImage(image.key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Uploads History */}
      {uploadedRecords.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Instagram Posts</CardTitle>
            <CardDescription>
              Images that have been posted to Instagram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedRecords.slice(0, 10).map((record) => (
                <div
                  key={record.image_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {record.image_key}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(record.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={record.status === 'uploaded' ? 'default' : 'secondary'}>
                      {record.trigger_time}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Posted
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
