import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Briefcase, 
  ArrowLeft,
  Save,
  XCircle,
  AlertCircle,
  CheckCircle,
  Edit
} from 'lucide-react';

const EditJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    unit: '',
    division: '',
    department: '',
    section: '',
    location: '',
    isActive: true
  });

  // Fetch job data
  const { data: job, isLoading, isError, error } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await api.get(`/jobs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Update form data when job data is loaded
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        code: job.code || '',
        description: job.description || '',
        unit: job.unit || '',
        division: job.division || '',
        department: job.department || '',
        section: job.section || '',
        location: job.location || '',
        isActive: job.isActive !== undefined ? job.isActive : true
      });
    }
  }, [job]);

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: async (jobData) => {
      const response = await api.put(`/jobs/${id}`, jobData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['job-stats']);
      queryClient.invalidateQueries(['job', id]);
      toast({
        title: 'Success',
        description: 'Job updated successfully!',
        variant: 'default'
      });
      navigate('/jobs');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update job',
        variant: 'destructive'
      });
    }
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateJobMutation.mutateAsync(formData);
  };

  const handleCancel = () => {
    navigate('/jobs');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading job: {error?.message}</p>
          <Button onClick={handleCancel} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Job not found</p>
          <Button onClick={handleCancel} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Briefcase className="h-8 w-8 mr-3 text-blue-600" />
            Edit Job
          </h1>
          <p className="text-gray-600 mt-2">Update job information and organizational details</p>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Edit className="h-5 w-5 mr-2 text-blue-600" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter job title"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="code">Job Code *</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="Enter job code"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter job description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1"
                  rows={4}
                />
              </div>

              {/* Organizational Structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="division">Division</Label>
                  <Input
                    id="division"
                    name="division"
                    value={formData.division}
                    onChange={handleInputChange}
                    placeholder="Enter division"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter location"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder="Enter unit"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Enter department"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    placeholder="Enter section"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active Job
                </Label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateJobMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateJobMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateJobMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Job
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditJob;
