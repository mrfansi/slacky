'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/providers/theme-provider';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      // Theme is automatically saved to localStorage by the theme provider
      // In a real app, you would save other settings to the database
      // For now, we'll just simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', content: 'Settings saved successfully' });
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
          <CardTitle className="text-2xl font-bold">Settings</CardTitle>
          <CardDescription>
            Customize your Slacky experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message.content && (
            <div className={`mb-4 p-4 rounded-md ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {message.content}
            </div>
          )}
          
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme">Theme</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred theme</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('light')}
                    >
                      Light
                    </Button>
                    <Button 
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                    >
                      Dark
                    </Button>
                    <Button 
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('system')}
                    >
                      System
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications for new messages and mentions</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound-effects">Sound Effects</Label>
                    <p className="text-sm text-muted-foreground">Play sounds for new messages and notifications</p>
                  </div>
                  <Switch
                    id="sound-effects"
                    checked={soundEffects}
                    onCheckedChange={setSoundEffects}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Change your password to keep your account secure
                  </p>
                  <Button variant="outline">Change Password</Button>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline">Set Up 2FA</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
