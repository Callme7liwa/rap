import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Plus, X, Save, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, search } from '@/lib/api-client';

type PollCategory = 'ARTIST' | 'ALBUM' | 'SONG';
type SearchType = 'artists' | 'albums' | 'songs';

interface SelectedNominee {
  item_id: number;
  item_type: PollCategory;
  item_name: string;
  item_image: string;
}

interface VoteOption {
  id: string;
  query: string;
  nominee: SelectedNominee | null;
}

function hasNominee(option: VoteOption): option is VoteOption & { nominee: SelectedNominee } {
  return option.nominee !== null;
}

function getSearchType(category: PollCategory): SearchType {
  if (category === 'ALBUM') return 'albums';
  if (category === 'SONG') return 'songs';
  return 'artists';
}

function getCategoryLabel(category: PollCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function NomineeSearchInput({
  option,
  category,
  index,
  onQueryChange,
  onSelect,
}: {
  option: VoteOption;
  category: PollCategory;
  index: number;
  onQueryChange: (id: string, query: string) => void;
  onSelect: (id: string, nominee: SelectedNominee) => void;
}) {
  const query = option.query.trim();
  const searchType = getSearchType(category);

  const { data, isFetching } = useQuery({
    queryKey: ['voting-nominee-search', category, query],
    queryFn: () => search(query, searchType),
    enabled: query.length >= 2 && option.nominee === null,
  });

  const results: SelectedNominee[] =
    category === 'ARTIST'
      ? (data?.artists.map((artist) => ({
          item_id: artist.id,
          item_type: category,
          item_name: artist.name,
          item_image: artist.image_url ?? '/placeholder.svg',
        })) ?? [])
      : category === 'ALBUM'
        ? (data?.albums.map((album) => ({
            item_id: album.id,
            item_type: category,
            item_name: album.name,
            item_image: album.cover_art_url ?? '/placeholder.svg',
          })) ?? [])
        : (data?.songs.map((song) => ({
            item_id: song.id,
            item_type: category,
            item_name: song.title,
            item_image: song.song_art_image_url ?? '/placeholder.svg',
          })) ?? []);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={option.query}
          onChange={(e) => onQueryChange(option.id, e.target.value)}
          placeholder={`Search ${getCategoryLabel(category)} nominee ${index + 1}`}
          className="pl-9"
          required
        />
      </div>

      {option.nominee && (
        <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <img
            src={option.nominee.item_image || '/placeholder.svg'}
            alt={option.nominee.item_name}
            className="h-8 w-8 rounded object-cover"
          />
          <span className="font-medium">{option.nominee.item_name}</span>
          <span className="text-muted-foreground">#{option.nominee.item_id}</span>
        </div>
      )}

      {query.length >= 2 && option.nominee === null && (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-md border bg-background shadow-hard">
          {isFetching ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          ) : results.length > 0 ? (
            results.map((result) => (
              <button
                key={`${result.item_type}-${result.item_id}`}
                type="button"
                onClick={() => onSelect(option.id, result)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <img
                  src={result.item_image || '/placeholder.svg'}
                  alt={result.item_name}
                  className="h-10 w-10 rounded object-cover"
                />
                <span className="font-medium">{result.item_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">#{result.item_id}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateVotingEvent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PollCategory>('ARTIST');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [options, setOptions] = useState<VoteOption[]>([
    { id: '1', query: '', nominee: null },
    { id: '2', query: '', nominee: null },
  ]);

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), query: '', nominee: null }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      toast({
        title: 'Error',
        description: 'You need at least 2 options',
        variant: 'destructive',
      });
      return;
    }
    setOptions(options.filter(opt => opt.id !== id));
  };

  const handleCategoryChange = (value: PollCategory) => {
    setCategory(value);
    setOptions(options.map((option) => ({ ...option, query: '', nominee: null })));
  };

  const updateOptionQuery = (id: string, query: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, query, nominee: null } : opt));
  };

  const selectOptionNominee = (id: string, nominee: SelectedNominee) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, query: nominee.item_name, nominee } : opt));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    const validOptions = options.filter(hasNominee);
    if (validOptions.length < 2) {
      toast({
        title: 'Error',
        description: 'You need at least 2 selected nominees',
        variant: 'destructive',
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: 'Error',
        description: 'Start and end dates are required',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await apiRequest('/voting/polls', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          period: 'MONTHLY',
          starts_at: new Date(startDate).toISOString(),
          ends_at: new Date(endDate).toISOString(),
          nominees: validOptions.map(opt => ({
            item_type: opt.nominee.item_type,
            item_id: opt.nominee.item_id,
          })),
        }),
      });
      
      toast({
        title: 'Success!',
        description: 'Voting event created successfully',
      });

      navigate('/voting');
    } catch (error) {
      console.error('Error creating voting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create voting event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/voting')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Voting
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-primary">
              Create Voting Event
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Create a new voting event for the community
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Best Hip-Hop Album of 2025"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more details about this voting event..."
                  rows={4}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={(value) => handleCategoryChange(value as PollCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARTIST">ARTIST</SelectItem>
                    <SelectItem value="ALBUM">ALBUM</SelectItem>
                    <SelectItem value="SONG">SONG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Voting Options *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex gap-2">
                      <div className="flex-1">
                        <NomineeSearchInput
                          option={option}
                          category={category}
                          index={index}
                          onQueryChange={updateOptionQuery}
                          onSelect={selectOptionNominee}
                        />
                      </div>
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(option.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/voting')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
