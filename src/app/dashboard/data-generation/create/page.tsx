'use client';

/**
 * Create Job Page
 * 
 * Page for creating a new data generation job.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/ui-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Save, Play } from 'lucide-react';

export default function CreateJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
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
  
  // Handle form submission
  const handleSubmit = async (startImmediately: boolean = false) => {
    if (!validateForm()) {
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
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToJobs}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Create Job</h1>
        </div>
        
        <div className="flex items-center gap-2">
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="schema">Schema Configuration</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Provide basic information about the data generation job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="job-name">Job Name *</Label>
                <Input
                  id="job-name"
                  placeholder="Enter job name"
                  value={jobName}
                  onChange={e => setJobName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="job-description">Description</Label>
                <Textarea
                  id="job-description"
                  placeholder="Enter job description"
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="output-format">Output Format</Label>
                  <Select value={outputFormat} onValueChange={setOutputFormat}>
                    <SelectTrigger id="output-format">
                      <SelectValue placeholder="Select output format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="sql">SQL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="record-count">Record Count *</Label>
                  <Input
                    id="record-count"
                    type="number"
                    min={1}
                    placeholder="Enter record count"
                    value={recordCount}
                    onChange={e => setRecordCount(Number(e.target.value))}
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
    </div>
  );
} 