"use client";

import { useState } from "react";
import { FiSettings, FiUser, FiShield, FiBell, FiSave } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Profile settings state
  const [profile, setProfile] = useState({
    name: "Current User",
    email: "user@example.com",
    company: "Example Corp",
  });

  // Security settings state
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    newsletterEnabled: true,
    apiNotificationsEnabled: true,
    jobCompletionEnabled: true,
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Profile updated",
      description: "Your profile information has been updated successfully.",
    });
    
    setSaving(false);
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Security settings updated",
      description: "Your security settings have been updated successfully.",
    });
    
    setSaving(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <FiSettings className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <FiUser className="w-4 h-4" />
            <span className="hidden md:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <FiShield className="w-4 h-4" />
            <span className="hidden md:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <FiBell className="w-4 h-4" />
            <span className="hidden md:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="profile" className="space-y-6">
            <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Profile Information</h3>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-medium">
                    Company
                  </label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </div>
                
                <Button type="submit" disabled={saving} className="flex items-center gap-2">
                  {saving ? 
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 
                    <FiSave className="w-4 h-4" />
                  }
                  Save Changes
                </Button>
              </form>
            </div>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-6">
            <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Account Security</h3>
              <form onSubmit={handleSecuritySubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch
                    checked={security.twoFactorEnabled}
                    onCheckedChange={(checked) => 
                      setSecurity({ ...security, twoFactorEnabled: checked })
                    }
                  />
                </div>
                
                <div className="space-y-2 pt-4">
                  <h4 className="font-medium">Change Password</h4>
                  <div className="space-y-2">
                    <label htmlFor="current-password" className="text-sm font-medium">
                      Current Password
                    </label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm font-medium">
                      New Password
                    </label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="text-sm font-medium">
                      Confirm New Password
                    </label>
                    <Input id="confirm-password" type="password" />
                  </div>
                </div>
                
                <Button type="submit" disabled={saving} className="flex items-center gap-2">
                  {saving ? 
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 
                    <FiSave className="w-4 h-4" />
                  }
                  Update Security Settings
                </Button>
              </form>
            </div>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
              <form className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Newsletter</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive updates about new features and improvements
                      </p>
                    </div>
                    <Switch
                      checked={security.newsletterEnabled}
                      onCheckedChange={(checked) => 
                        setSecurity({ ...security, newsletterEnabled: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">API Status</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive notifications about API status and incidents
                      </p>
                    </div>
                    <Switch
                      checked={security.apiNotificationsEnabled}
                      onCheckedChange={(checked) => 
                        setSecurity({ ...security, apiNotificationsEnabled: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Job Completion</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get notified when your data generation jobs are complete
                      </p>
                    </div>
                    <Switch
                      checked={security.jobCompletionEnabled}
                      onCheckedChange={(checked) => 
                        setSecurity({ ...security, jobCompletionEnabled: checked })
                      }
                    />
                  </div>
                </div>
                
                <Button type="submit" className="flex items-center gap-2">
                  <FiSave className="w-4 h-4" />
                  Save Notification Settings
                </Button>
              </form>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}