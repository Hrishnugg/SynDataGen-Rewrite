'use client';

/**
 * Create Job Page
 * 
 * Page for creating a new data generation job.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Save, Play, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { dataGenerationClient } from '@/features/data-generation/services/client';

// Project type definition
interface Project {
  id: string;
  name: string;
  description?: string;
}

export default function CreateJobPage() {
  return (
    <Suspense fallback={<JobFormSkeleton />}>
      <CreateJobForm />
    </Suspense>
  );
}

// Skeleton loading state for the form
function JobFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Job</h1>
        <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-md"></div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="w-48 h-7 bg-gray-200 animate-pulse rounded-md"></div>
          </CardTitle>
          <CardDescription>
            <div className="w-64 h-5 bg-gray-200 animate-pulse rounded-md"></div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="w-24 h-5 bg-gray-200 animate-pulse rounded-md"></div>
                <div className="w-full h-10 bg-gray-200 animate-pulse rounded-md"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateJobForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Get project ID from URL on component mount and fetch all projects
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    
    // Fetch all available projects
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status}`);
        }
        
        const data = await response.json();
        setProjects(data.projects || []);
        
        // If projectId is provided in URL, set it directly
        if (projectIdFromUrl) {
          setProjectId(projectIdFromUrl);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error loading projects',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          variant: 'destructive',
        });
      } finally {
        setLoadingProjects(false);
      }
    };
    
    fetchProjects();
  }, [searchParams]);
  
  // Basic job information
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [outputFormat, setOutputFormat] = useState('csv');
  const [recordCount, setRecordCount] = useState(1000);
  
  // Schema configuration
  const [fields, setFields] = useState<Array<{
    name: string;
    type: string;
    options: Record<string, any>;
  }>>([
    { name: 'id', type: 'uuid', options: {} },
    { name: 'name', type: 'fullName', options: {} },
    { name: 'email', type: 'email', options: {} },
    { name: 'createdAt', type: 'date', options: { past: true } },
  ]);
  
  // Advanced options
  const [batchSize, setBatchSize] = useState(100);
  const [seed, setSeed] = useState('');
  const [locale, setLocale] = useState('en');
  const [includeNulls, setIncludeNulls] = useState(false);
  const [nullProbability, setNullProbability] = useState(0.1);
  
  // Add a project selection section to the form
  const renderProjectSelection = () => {
    if (loadingProjects) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading projects...</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <Label htmlFor="project-select" className="text-sm font-medium">
          Project
        </Label>
        <Select
          value={projectId || ''}
          onValueChange={(value) => setProjectId(value)}
          disabled={projects.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.length === 0 ? (
              <SelectItem value="no-projects" disabled>
                No projects available
              </SelectItem>
            ) : (
              projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {!projectId && (
          <p className="text-sm text-muted-foreground">
            Please select a project to associate this job with
          </p>
        )}
      </div>
    );
  };
  
  // Add a new field to the schema
  const addField = () => {
    setFields([...fields, { name: '', type: 'string', options: {} }]);
  };
  
  // Remove a field from the schema
  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };
  
  // Update a field in the schema
  const updateField = (index: number, field: { name: string; type: string; options: Record<string, any> }) => {
    const newFields = [...fields];
    newFields[index] = field;
    setFields(newFields);
  };
  
  // Handle field name change
  const handleFieldNameChange = (index: number, name: string) => {
    const newFields = [...fields];
    newFields[index].name = name;
    setFields(newFields);
  };
  
  // Handle field type change
  const handleFieldTypeChange = (index: number, type: string) => {
    const newFields = [...fields];
    newFields[index].type = type;
    
    // Reset options when type changes
    newFields[index].options = {};
    
    setFields(newFields);
  };
  
  // Handle field option change
  const handleFieldOptionChange = (index: number, option: string, value: any) => {
    const newFields = [...fields];
    newFields[index].options = {
      ...newFields[index].options,
      [option]: value,
    };
    setFields(newFields);
  };
  
  // Navigate back to jobs list
  const handleBackToJobs = () => {
    router.push('/dashboard/data-generation/jobs');
  };
  
  // Handle form submission
  const handleSubmit = async (startImmediately: boolean = false) => {
    if (!validateForm()) {
      return;
    }
    
    if (!projectId) {
      toast({
        title: 'Project selection required',
        description: 'Please select a project for this job.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const jobConfig = {
        name: jobName,
        description: jobDescription,
        outputFormat,
        recordCount,
        schema: {
          fields: fields.reduce((acc, field) => {
            acc[field.name] = {
              type: field.type,
              ...field.options,
            };
            return acc;
          }, {} as Record<string, any>),
        },
        options: {
          batchSize,
          seed: seed || undefined,
          locale,
          includeNulls,
          nullProbability: includeNulls ? nullProbability : 0,
        },
        startImmediately,
        projectId,
      };
      
      const jobId = await dataGenerationClient.createJob(jobConfig);
      
      toast({
        title: 'Job created successfully',
        description: `Job ID: ${jobId}`,
      });
      
      // Navigate to job details page
      router.push(`/dashboard/data-generation/jobs/${jobId}`);
    } catch (error) {
      toast({
        title: 'Failed to create job',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get field type options
  const getFieldTypeOptions = () => {
    return [
      { value: 'string', label: 'String' },
      { value: 'integer', label: 'Integer' },
      { value: 'float', label: 'Float' },
      { value: 'boolean', label: 'Boolean' },
      { value: 'date', label: 'Date' },
      { value: 'uuid', label: 'UUID' },
      { value: 'fullName', label: 'Full Name' },
      { value: 'firstName', label: 'First Name' },
      { value: 'lastName', label: 'Last Name' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone Number' },
      { value: 'address', label: 'Address' },
      { value: 'city', label: 'City' },
      { value: 'country', label: 'Country' },
      { value: 'zipCode', label: 'Zip Code' },
      { value: 'company', label: 'Company' },
      { value: 'jobTitle', label: 'Job Title' },
      { value: 'creditCard', label: 'Credit Card' },
      { value: 'iban', label: 'IBAN' },
      { value: 'color', label: 'Color' },
      { value: 'url', label: 'URL' },
      { value: 'ipAddress', label: 'IP Address' },
      { value: 'lorem', label: 'Lorem Ipsum' },
    ];
  };
  
  // Render field options based on type
  const renderFieldOptions = (field: { name: string; type: string; options: Record<string, any> }, index: number) => {
    switch (field.type) {
      case 'integer':
      case 'float':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`min-${index}`}>Min Value</Label>
              <Input
                id={`min-${index}`}
                type="number"
                value={field.options.min ?? ''}
                onChange={e => handleFieldOptionChange(index, 'min', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`max-${index}`}>Max Value</Label>
              <Input
                id={`max-${index}`}
                type="number"
                value={field.options.max ?? ''}
                onChange={e => handleFieldOptionChange(index, 'max', Number(e.target.value))}
              />
            </div>
          </div>
        );
      
      case 'date':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`past-${index}`}>Past Date</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id={`past-${index}`}
                  checked={field.options.past ?? false}
                  onCheckedChange={value => handleFieldOptionChange(index, 'past', value)}
                />
                <span>{field.options.past ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`future-${index}`}>Future Date</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id={`future-${index}`}
                  checked={field.options.future ?? false}
                  onCheckedChange={value => handleFieldOptionChange(index, 'future', value)}
                />
                <span>{field.options.future ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        );
      
      case 'string':
        return (
          <div className="space-y-2">
            <Label htmlFor={`length-${index}`}>Length</Label>
            <Input
              id={`length-${index}`}
              type="number"
              value={field.options.length ?? ''}
              onChange={e => handleFieldOptionChange(index, 'length', Number(e.target.value))}
            />
          </div>
        );
      
      case 'lorem':
        return (
          <div className="space-y-2">
            <Label htmlFor={`paragraphs-${index}`}>Paragraphs</Label>
            <Input
              id={`paragraphs-${index}`}
              type="number"
              value={field.options.paragraphs ?? ''}
              onChange={e => handleFieldOptionChange(index, 'paragraphs', Number(e.target.value))}
            />
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Validate the form
  const validateForm = () => {
    if (!jobName.trim()) {
      toast({
        title: 'Job name is required',
        description: 'Please provide a name for the job.',
        variant: 'destructive',
      });
      return false;
    }
    
    if (!projectId) {
      toast({
        title: 'Project is required',
        description: 'Please select a project for this job.',
        variant: 'destructive',
      });
      return false;
    }
    
    if (recordCount <= 0) {
      toast({
        title: 'Invalid record count',
        description: 'Record count must be greater than 0.',
        variant: 'destructive',
      });
      return false;
    }
    
    if (fields.length === 0) {
      toast({
        title: 'No fields defined',
        description: 'Please add at least one field to the schema.',
        variant: 'destructive',
      });
      return false;
    }
    
    // Check for empty field names
    const emptyFieldNames = fields.some(field => !field.name.trim());
    if (emptyFieldNames) {
      toast({
        title: 'Empty field names',
        description: 'All fields must have a name.',
        variant: 'destructive',
      });
      return false;
    }
    
    // Check for duplicate field names
    const fieldNames = fields.map(field => field.name);
    const hasDuplicates = fieldNames.some((name, index) => fieldNames.indexOf(name) !== index);
    if (hasDuplicates) {
      toast({
        title: 'Duplicate field names',
        description: 'Field names must be unique.',
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4" 
          onClick={handleBackToJobs}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
        <h1 className="text-3xl font-bold">Create New Job</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="schema">Schema Configuration</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide basic information about the data generation job.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Selection */}
              {renderProjectSelection()}
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="job-name" className="text-sm font-medium">
                  Job Name
                </Label>
                <Input
                  id="job-name"
                  placeholder="Enter job name"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="job-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="job-description"
                  placeholder="Enter job description (optional)"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="output-format" className="text-sm font-medium">
                    Output Format
                  </Label>
                  <Select
                    value={outputFormat}
                    onValueChange={setOutputFormat}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="parquet">Parquet</SelectItem>
                      <SelectItem value="avro">Avro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="record-count" className="text-sm font-medium">
                    Record Count
                  </Label>
                  <Input
                    id="record-count"
                    type="number"
                    min={1}
                    value={recordCount}
                    onChange={(e) => setRecordCount(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schema Configuration</CardTitle>
              <CardDescription>Define the structure of the generated data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={index} className="border rounded-md p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Field {index + 1}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`field-name-${index}`}>Field Name *</Label>
                        <Input
                          id={`field-name-${index}`}
                          placeholder="Enter field name"
                          value={field.name}
                          onChange={e => handleFieldNameChange(index, e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`field-type-${index}`}>Field Type *</Label>
                        <Select
                          value={field.type}
                          onValueChange={value => handleFieldTypeChange(index, value)}
                        >
                          <SelectTrigger id={`field-type-${index}`}>
                            <SelectValue placeholder="Select field type" />
                          </SelectTrigger>
                          <SelectContent>
                            {getFieldTypeOptions().map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {renderFieldOptions(field, index)}
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addField}
                  className="w-full flex items-center justify-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Field</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Options</CardTitle>
              <CardDescription>Configure advanced settings for data generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min={1}
                    placeholder="Enter batch size"
                    value={batchSize}
                    onChange={e => setBatchSize(Number(e.target.value))}
                  />
                  <p className="text-sm text-gray-500">Number of records to generate in each batch</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="seed">Random Seed</Label>
                  <Input
                    id="seed"
                    placeholder="Enter random seed"
                    value={seed}
                    onChange={e => setSeed(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">Optional seed for reproducible results</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="locale">Locale</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger id="locale">
                    <SelectValue placeholder="Select locale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Locale for generating region-specific data</p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-nulls"
                    checked={includeNulls}
                    onCheckedChange={setIncludeNulls}
                  />
                  <Label htmlFor="include-nulls">Include NULL values</Label>
                </div>
                
                {includeNulls && (
                  <div className="space-y-2">
                    <Label htmlFor="null-probability">NULL Probability</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="null-probability"
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={nullProbability}
                        onChange={e => setNullProbability(Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="w-12 text-center">{nullProbability}</span>
                    </div>
                    <p className="text-sm text-gray-500">Probability of generating NULL values (0-1)</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex items-center gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          className="flex items-center gap-1"
        >
          <Save className="h-4 w-4" />
          <span>Save</span>
        </Button>
        
        <Button
          variant="default"
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
          className="flex items-center gap-1"
        >
          <Play className="h-4 w-4" />
          <span>Save & Start</span>
        </Button>
      </div>
    </div>
  );
} 