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
import { createBlogPost } from '@/lib/blog-api';
import type { BlogDraft } from '@/types/blog';

export default function BlogCreate() {
  const navigate = useNavigate();
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [draft, setDraft] = useState<BlogDraft>({
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    tags: [],
    status: 'draft'
  });

  const handleInputChange = (field: keyof BlogDraft, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !draft.tags.includes(tagInput.trim())) {
      setDraft(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setDraft(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSave = async (status: 'draft' | 'published') => {
    setIsSaving(true);
    try {
      const postData = { ...draft, status };
      const newPost = await createBlogPost(postData);
      
      // Navigate to the new post
      setTimeout(() => {
        navigate(`/blog/${newPost.slug}`);
      }, 500);
    } catch (error) {
      console.error('Failed to save post:', error);
      alert('Failed to save post. Please try again.');
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
              onClick={() => handleSave('draft')}
              disabled={isSaving || !draft.title}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave('published')}
              disabled={isSaving || !draft.title || !draft.content}
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
                  value={draft.coverImage}
                  onChange={(e) => handleInputChange('coverImage', e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              {draft.coverImage && (
                <div className="mt-4 rounded-lg overflow-hidden">
                  <img
                    src={draft.coverImage}
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
                value={draft.title}
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
                value={draft.excerpt}
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
                value={draft.content}
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
                {draft.tags.map((tag) => (
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
              {draft.coverImage && (
                <div className="w-full h-64 bg-muted">
                  <img
                    src={draft.coverImage}
                    alt={draft.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-8">
                <h1 className="text-4xl font-bold mb-4">{draft.title || 'Untitled'}</h1>
                
                {draft.excerpt && (
                  <p className="text-lg text-muted-foreground mb-6 italic">
                    {draft.excerpt}
                  </p>
                )}

                {draft.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {draft.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <hr className="my-6 border-border" />

                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  {draft.content ? renderMarkdown(draft.content) : (
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
