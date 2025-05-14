'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setImage(session.user.image || '');
    }
  }, [session]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update the session with new user data
      await update({
        ...session,
        user: {
          ...session?.user,
          name,
          image,
        },
      });

      setMessage({ type: 'success', content: 'Profile updated successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', content: err.message || 'An unexpected error occurred' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return null; // Protected by middleware, but this is a fallback
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card className="w-full shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Your Profile</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message.content && (
            <div className={`mb-4 p-4 rounded-md ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {message.content}
            </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={image || undefined} alt={name} />
                <AvatarFallback>{name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image">Profile Image URL</Label>
                <Input
                  id="image"
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/your-image.jpg"
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-500">Enter a URL for your profile image</p>
              </div>
              
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
