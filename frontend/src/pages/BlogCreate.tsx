import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Image as ImageIcon, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createBlogPost, getArtists } from '@/lib/blog-api';
import { useAuth } from '@/store/auth.store';
import { toast } from 'sonner';

interface BlogPostFormData {
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
}

export default function BlogCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState<BlogPostFormData>({
    title: '',
    content: '',
    excerpt: '',
    cover_image: '',
    tags: [],
    status: 'DRAFT',
  });

  const handleInputChange = (field: keyof BlogPostFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const resolveArtistId = async (): Promise<number | null> => {
    if (user?.artist?.id) {
      return user.artist.id;
    }

    if (!user) {
      return null;
    }

    const artists = await getArtists({ limit: 100 });
    return artists.data.find((artist) => artist.user_id === user.id)?.id ?? null;
  };

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    setFormData(prev => ({ ...prev, status }));
    setIsSaving(true);
    try {
      const artistId = await resolveArtistId();

      if (!artistId) {
        toast.error('No artist profile is associated with your account');
        return;
      }

      const newPost = await createBlogPost({
        ...formData,
        status,
        artist_id: artistId,
      });
      
      // Navigate to the new post
      setTimeout(() => {
        navigate(status === 'PUBLISHED' ? `/blog/${newPost.slug}` : `/blog/${newPost.slug}/edit`);
      }, 500);
    } catch (error) {
      console.error('Failed to save post:', error);
      toast.error('Failed to save post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xl font-semibold mt-6 mb-3">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-bold mt-8 mb-4">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-3xl font-bold mt-8 mb-4">{line.slice(2)}</h1>;
      }
      
      // Horizontal rule
      if (line.trim() === '---') {
        return <hr key={idx} className="my-6 border-border" />;
      }
      
      // Lists
      if (line.startsWith('- ')) {
        return <li key={idx} className="ml-4">{line.slice(2)}</li>;
      }
      
      // Paragraphs
      if (line.trim()) {
        return <p key={idx} className="mb-4 leading-relaxed">{line}</p>;
      }
      
      return <br key={idx} />;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/blog')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Write an Article</h1>
              <p className="text-muted-foreground">Share your story with the community</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPreview(!isPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave('DRAFT')}
              disabled={isSaving || !formData.title}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave('PUBLISHED')}
              disabled={isSaving || !formData.title || !formData.content}
            >
              Publish
            </Button>
          </div>
        </div>

        {!isPreview ? (
          /* Editor Mode */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Cover Image */}
            <Card className="p-6">
              <Label htmlFor="coverImage" className="text-lg font-semibold mb-3 block">
                Cover Image URL
              </Label>
              <div className="flex gap-3">
                <Input
                  id="coverImage"
                  placeholder="https://example.com/image.jpg"
                  value={formData.cover_image}
                  onChange={(e) => handleInputChange('cover_image', e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              {formData.cover_image && (
                <div className="mt-4 rounded-lg overflow-hidden">
                  <img
                    src={formData.cover_image}
                    alt="Cover preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </Card>

            {/* Title */}
            <Card className="p-6">
              <Label htmlFor="title" className="text-lg font-semibold mb-3 block">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter your article title..."
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="text-2xl font-bold h-auto py-3"
              />
            </Card>

            {/* Excerpt */}
            <Card className="p-6">
              <Label htmlFor="excerpt" className="text-lg font-semibold mb-3 block">
                Excerpt
              </Label>
              <Textarea
                id="excerpt"
                placeholder="Write a brief summary of your article..."
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-2">
                A short description that appears in article listings
              </p>
            </Card>

            {/* Content */}
            <Card className="p-6">
              <Label htmlFor="content" className="text-lg font-semibold mb-3 block">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="Write your article content here...&#10;&#10;You can use markdown formatting:&#10;## Heading 2&#10;### Heading 3&#10;- List item&#10;--- (horizontal line)"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold mb-2">Markdown Tips:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li><code className="bg-background px-1 rounded">## Heading</code> - Creates a heading</li>
                  <li><code className="bg-background px-1 rounded">- List item</code> - Creates a bullet point</li>
                  <li><code className="bg-background px-1 rounded">---</code> - Creates a horizontal line</li>
                </ul>
              </div>
            </Card>

            {/* Tags */}
            <Card className="p-6">
              <Label htmlFor="tags" className="text-lg font-semibold mb-3 block">
                Tags
              </Label>
              <div className="flex gap-2 mb-3">
                <Input
                  id="tags"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button onClick={handleAddTag} variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </Card>
          </motion.div>
        ) : (
          /* Preview Mode */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <Card className="overflow-hidden">
              {formData.cover_image && (
                <div className="w-full h-64 bg-muted">
                  <img
                    src={formData.cover_image}
                    alt={formData.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-8">
                <h1 className="text-4xl font-bold mb-4">{formData.title || 'Untitled'}</h1>
                
                {formData.excerpt && (
                  <p className="text-lg text-muted-foreground mb-6 italic">
                    {formData.excerpt}
                  </p>
                )}

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <hr className="my-6 border-border" />

                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  {formData.content ? renderMarkdown(formData.content) : (
                    <p className="text-muted-foreground italic">No content yet...</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
