import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Mail, Upload, Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/store/auth.store';

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [userInfo, setUserInfo] = useState({
    email: '',
    display_name: '',
    profile_picture: '',
    bio: '',
    user_id: '',
  });

  const [formData, setFormData] = useState({
    display_name: '',
    profile_picture: '',
    bio: '',
  });

  useEffect(() => {
    loadUserProfile();
  }, [user, isAuthenticated]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      if (!isAuthenticated || !user) {
        toast.error('Please sign in to view your profile');
        navigate('/');
        return;
      }
      
      const userData = {
        email: user.email,
        display_name: user.display_name || 'User',
        profile_picture: user.avatar_url || '',
        bio: '',
        user_id: String(user.id),
      };

      setUserInfo(userData);

      setFormData({
        display_name: userData.display_name,
        profile_picture: userData.profile_picture,
        bio: userData.bio,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = URL.createObjectURL(file);

      // Update formData
      const updatedFormData = { 
        ...formData, 
        profile_picture: imageUrl 
      };
      setFormData(updatedFormData);

      setUserInfo({
        ...userInfo,
        profile_picture: imageUrl,
      });

      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.display_name.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      if (!isAuthenticated) {
        toast.error('Please sign in to update profile');
        return;
      }
      
      setUserInfo({
        ...userInfo,
        display_name: formData.display_name,
        profile_picture: formData.profile_picture,
        bio: formData.bio,
      });

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  console.log("userInfo",userInfo.profile_picture)
  console.log("formdata",formData.profile_picture)

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-4xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account information and preferences
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your profile picture and display name
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={formData.profile_picture || userInfo.profile_picture} />
                  <AvatarFallback className="text-2xl">
                    {formData.display_name.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="picture-upload" className="block mb-2">
                    Profile Picture
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('picture-upload')?.click()}
                      disabled={uploadingImage}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    {formData.profile_picture && (
                      <Button
                        variant="ghost"
                        onClick={() => setFormData({ ...formData, profile_picture: '' })}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="picture-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Display Name */}
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Enter your display name"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This name will be displayed on your comments and posts
                </p>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="mt-2 min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              {/* Email (Read-only) */}
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={userInfo.email}
                  disabled
                  className="mt-2 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Email cannot be changed
                </p>
              </div>

              <Separator />

              {/* Save Button */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      display_name: userInfo.display_name,
                      profile_picture: userInfo.profile_picture,
                      bio: userInfo.bio,
                    });
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || uploadingImage}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs mt-1">{userInfo.user_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email Verified</p>
                  <p className="mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500">
                      Verified
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
