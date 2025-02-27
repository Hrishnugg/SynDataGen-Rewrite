import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Key, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Customer } from '@/lib/customers';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface CustomerServiceAccountPanelProps {
  customer: Customer;
  isLoading?: boolean;
  onCreateServiceAccount: () => Promise<void>;
  onDeleteServiceAccount: () => Promise<void>;
  onRotateServiceAccountKey: () => Promise<void>;
}

export default function CustomerServiceAccountPanel({
  customer,
  isLoading = false,
  onCreateServiceAccount,
  onDeleteServiceAccount,
  onRotateServiceAccountKey,
}: CustomerServiceAccountPanelProps) {
  const { toast } = useToast();
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isRotateLoading, setIsRotateLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);

  const handleCreateServiceAccount = async () => {
    try {
      setIsCreateLoading(true);
      await onCreateServiceAccount();
      toast({
        title: 'Service account created',
        description: 'The service account was created successfully.',
      });
    } catch (error) {
      console.error('Error creating service account:', error);
      toast({
        title: 'Error',
        description: 'Failed to create service account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreateLoading(false);
    }
  };

  const handleDeleteServiceAccount = async () => {
    try {
      setIsDeleteLoading(true);
      await onDeleteServiceAccount();
      setDeleteDialogOpen(false);
      toast({
        title: 'Service account deleted',
        description: 'The service account was deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting service account:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleRotateServiceAccountKey = async () => {
    try {
      setIsRotateLoading(true);
      await onRotateServiceAccountKey();
      setRotateDialogOpen(false);
      toast({
        title: 'Service account key rotated',
        description: 'The service account key was rotated successfully.',
      });
    } catch (error) {
      console.error('Error rotating service account key:', error);
      toast({
        title: 'Error',
        description: 'Failed to rotate service account key. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRotateLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-3/4" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full mt-2" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full mt-2" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Service Account
        </CardTitle>
        <CardDescription>
          Manage the service account used by this customer to access the API
        </CardDescription>
      </CardHeader>
      <CardContent>
        {customer.serviceAccount ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold">Service Account Email</h3>
                <p className="text-sm mt-1 break-all">{customer.serviceAccount.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Key Reference</h3>
                <p className="text-sm mt-1 break-all">{customer.serviceAccount.keyReference}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Created</h3>
                <p className="text-sm mt-1">
                  {formatDistanceToNow(new Date(customer.serviceAccount.created), { addSuffix: true })}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Key Last Rotated</h3>
                <p className="text-sm mt-1">
                  {formatDistanceToNow(new Date(customer.serviceAccount.lastRotated), { addSuffix: true })}
                </p>
              </div>
            </div>

            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Security best practice</AlertTitle>
              <AlertDescription>
                It's recommended to rotate service account keys regularly for enhanced security.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <Key className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No Service Account</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This customer doesn't have a service account yet.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {customer.serviceAccount ? (
          <>
            {/* Rotate Key Dialog */}
            <Dialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Rotate Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rotate Service Account Key</DialogTitle>
                  <DialogDescription>
                    This will create a new key for the service account and delete the old one. 
                    Any applications using the current key will need to be updated.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Rotating the key will invalidate the current key immediately. Make sure you 
                      update any applications using this service account after rotating.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button 
                    variant="ghost" 
                    onClick={() => setRotateDialogOpen(false)}
                    disabled={isRotateLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRotateServiceAccountKey}
                    disabled={isRotateLoading}
                  >
                    {isRotateLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Rotating...
                      </>
                    ) : (
                      'Rotate Key'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Service Account</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this service account? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Deleting this service account will immediately revoke access to any application 
                      using it. This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button 
                    variant="ghost" 
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={isDeleteLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteServiceAccount}
                    disabled={isDeleteLoading}
                  >
                    {isDeleteLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Service Account'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <Button 
            onClick={handleCreateServiceAccount}
            disabled={isCreateLoading}
          >
            {isCreateLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Service Account'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 