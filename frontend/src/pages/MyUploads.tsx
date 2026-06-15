import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, Trash2, Image, Music, File, Eye, EyeOff, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getStoredAuthToken } from '@/store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UploadItem {
  upload_id: string;
  filename: string;
  content_type: string;
  size: number;
  category: string;
  visibility: string;
  created_at: number;
  url: string;
}

export default function MyUploads() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadUploads();
  }, [filter]);

  const loadUploads = async () => {
    try {
      setLoading(true);
      const token = getStoredAuthToken();

      const params = filter !== 'all' ? `?category=${filter}` : '';
      const response = await fetch(`${API_URL}/api/uploads${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load uploads');
      }

      const data = await response.json();
      setUploads(data.uploads);
    } catch (error) {
      console.error('Failed to load uploads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load uploads',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('visibility', 'private');
      formData.append('category', filter !== 'all' ? filter : 'general');

      const token = getStoredAuthToken();

      const response = await fetch(`${API_URL}/api/uploads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      toast({
        title: 'Success!',
        description: 'File uploaded successfully'
      });
      loadUploads();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Upload failed',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (uploadId: string) => {
    if (!confirm('Delete this file? This action cannot be undone.')) return;

    try {
      const token = getStoredAuthToken();

      const response = await fetch(`${API_URL}/api/uploads/${uploadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast({
        title: 'Success',
        description: 'File deleted successfully'
      });
      loadUploads();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive'
      });
    }
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <Image className="w-6 h-6 text-primary" />;
    if (contentType.startsWith('audio/')) return <Music className="w-6 h-6 text-muted-foreground" />;
    return <File className="w-6 h-6 text-gray-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-primary">
                My Uploads
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage your uploaded files
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        </motion.div>

        {/* Upload Button & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-none p-6 mb-6 shadow-hard"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Filter className="w-4 h-4 inline mr-2" />
                All
              </button>
              <button
                onClick={() => setFilter('images')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === 'images'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Image className="w-4 h-4 inline mr-2" />
                Images
              </button>
              <button
                onClick={() => setFilter('audio')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === 'audio'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Music className="w-4 h-4 inline mr-2" />
                Audio
              </button>
            </div>

            <label className="relative">
              <input
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload className="w-5 h-5" />
                <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
              </div>
            </label>
          </div>
        </motion.div>

        {/* Uploads Grid */}
        {loading ? (
          <div className="text-center text-gray-600 dark:text-gray-400 py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            Loading...
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No uploads yet. Upload your first file!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploads.map((upload, index) => (
              <motion.div
                key={upload.upload_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass rounded-none p-6 shadow-hard hover:shadow-hard-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-sm">
                    {getFileIcon(upload.content_type)}
                  </div>
                  <div className="flex gap-2">
                    {upload.visibility === 'private' ? (
                      <EyeOff className="w-4 h-4 text-gray-400" title="Private" />
                    ) : (
                      <Eye className="w-4 h-4 text-green-500" title="Public" />
                    )}
                  </div>
                </div>

                <h3 className="font-semibold mb-2 truncate text-gray-900 dark:text-white">
                  {upload.filename}
                </h3>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                  <p>Size: {formatSize(upload.size)}</p>
                  <p>Uploaded: {formatDate(upload.created_at)}</p>
                  <p>Category: <span className="capitalize">{upload.category}</span></p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={upload.url}
                    download={upload.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-none transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button
                    onClick={() => handleDelete(upload.upload_id)}
                    className="flex items-center justify-center bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 p-2 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
