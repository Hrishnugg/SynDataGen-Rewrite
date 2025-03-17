/**
 * Re-export the CustomerForm component from its actual location
 * This barrel file helps maintain backward compatibility with existing imports
 */

import { CustomerForm } from '@/features/customers/components/CustomerForm';

// Export the component and its associated types
export { CustomerForm };
export type { CustomerFormValues } from '@/features/customers/components/CustomerForm';
export interface CustomerFormProps {
  initialData?: any;
  isEditing?: boolean;
  onSubmit: (data: any) => void;
  mode?: 'create' | 'edit';
}
