import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { 
  Briefcase, 
  ArrowLeft,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  BookOpen,
  FileDown,
  FileSpreadsheet
} from 'lucide-react';

const ViewJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch job data
  const { data: job, isLoading, isError, error } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await api.get(`/jobs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch competency profile (JCP) data
  const { data: jcpData } = useQuery({
    queryKey: ['job-jcp', job?.id],
    queryFn: async () => {
      if (!job?.id) return { mappings: [] };
      try {
        const response = await api.get(`/job-competencies?jobId=${job.id}&limit=1000`);
        return response.data;
      } catch (e) {
        return { mappings: [] };
      }
    },
    enabled: !!job?.id,
  });

  const jcpMappings = jcpData?.mappings || [];

  // Export to PDF using browser print
  const handleExportPDF = () => {
    if (!job) return;
    
    try {
      // Create a print-friendly version
      const printWindow = window.open('', '_blank');
      const content = document.getElementById('job-content').innerHTML;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${job.title} - ${job.code}</title>
            <style>
              @page { margin: 1cm; }
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                color: #333;
                max-width: 1000px;
                margin: 0 auto;
                padding: 20px;
              }
              h1 { color: #1e40af; font-size: 24px; margin-bottom: 10px; }
              h2 { color: #1e40af; font-size: 20px; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px; }
              h3 { color: #374151; font-size: 16px; margin-top: 20px; margin-bottom: 8px; }
              h4 { color: #6b7280; font-size: 14px; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
              .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: white; }
              .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 8px; }
              .badge-blue { background: #dbeafe; color: #1e40af; }
              .badge-green { background: #dcfce7; color: #166534; }
              .badge-red { background: #fee2e2; color: #991b1b; }
              .section { margin-bottom: 25px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              ul { margin-left: 20px; }
              .highlight-box { padding: 15px; border-radius: 6px; margin: 10px 0; }
              .blue-box { background: #eff6ff; border-left: 4px solid #3b82f6; }
              .green-box { background: #f0fdf4; border-left: 4px solid #22c55e; }
              .purple-box { background: #faf5ff; border-left: 4px solid #a855f7; }
              .yellow-box { background: #fefce8; border-left: 4px solid #eab308; }
              .indigo-box { background: #eef2ff; border-left: 4px solid #6366f1; }
              .orange-box { background: #fff7ed; border-left: 4px solid #f97316; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1e40af; padding-bottom: 20px;">
              <h1>${job.title}</h1>
              <div style="margin-top: 10px;">
                <span class="badge badge-blue">${job.code}</span>
                ${job.grade ? `<span class="badge badge-blue">Grade ${job.grade}</span>` : ''}
                <span class="badge ${job.isActive ? 'badge-green' : 'badge-red'}">${job.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            ${content}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
      toast({
        title: 'Success',
        description: 'PDF print dialog opened!',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive'
      });
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!job) return;
    
    try {
      // Create Excel data
      const excelData = [];
      
      // Basic Information
      excelData.push(['Job Information', '']);
      excelData.push(['Title', job.title]);
      excelData.push(['Code', job.code]);
      if (job.jcp_code || job.jcpCode) excelData.push(['JCP Code', job.jcp_code || job.jcpCode]);
      if (job.grade) excelData.push(['Grade', job.grade]);
      excelData.push(['Status', job.isActive ? 'Active' : 'Inactive']);
      excelData.push(['Division', job.division || '']);
      excelData.push(['Department', job.department || '']);
      excelData.push(['Section', job.section || '']);
      excelData.push(['Unit', job.unit || '']);
      excelData.push(['Location', job.location || '']);
      excelData.push(['Created', new Date(job.createdAt).toLocaleDateString()]);
      excelData.push(['Updated', new Date(job.updatedAt).toLocaleDateString()]);
      if (job.description) excelData.push(['Description', job.description]);
      excelData.push(['', '']); // Empty row
      
      // JD Information
      if (job.budgetaryControl !== undefined || job.externalInterfaces || job.internalInterfaces || 
          job.jobScope || job.accountabilities || job.qualificationsExperience || 
          job.restrictions || job.authority || job.demands) {
        excelData.push(['Job Description (JD)', '']);
        
        // Dimensions
        if (job.budgetaryControl !== undefined || job.externalInterfaces || job.internalInterfaces) {
          excelData.push(['Dimensions', '']);
          if (job.budgetaryControl !== undefined) {
            excelData.push(['Budgetary Control', job.budgetaryControl ? 'Yes' : 'No']);
          }
          if (job.externalInterfaces) {
            excelData.push(['External Interfaces', job.externalInterfaces]);
          }
          if (job.internalInterfaces) {
            excelData.push(['Internal Interfaces', job.internalInterfaces]);
          }
        }
        
        // Core JD
        if (job.jobScope) excelData.push(['Job Scope', job.jobScope]);
        if (job.accountabilities) excelData.push(['Accountabilities', job.accountabilities]);
        if (job.qualificationsExperience) {
          excelData.push(['Qualifications and Experience', job.qualificationsExperience]);
        }
        
        // Special Conditions
        if (job.restrictions || job.authority || job.demands) {
          excelData.push(['Special Conditions', '']);
          if (job.restrictions) excelData.push(['Restrictions', job.restrictions]);
          if (job.authority) excelData.push(['Authority', job.authority]);
          if (job.demands) excelData.push(['Demands', job.demands]);
        }
        excelData.push(['', '']); // Empty row
      }
      
      // Competency Profile
      if (jcpMappings.length > 0) {
        excelData.push(['Competency Profile', '']);
        excelData.push(['Competency Name', 'Family', 'Required Level', 'Required/Optional', 'Definition']);
        jcpMappings.forEach(mapping => {
          excelData.push([
            mapping.competency_name || mapping.competency?.name || `Competency ${mapping.competencyId}`,
            mapping.competency_family || mapping.competency?.family || '',
            mapping.requiredLevel || mapping.required_level || 'N/A',
            mapping.isRequired !== undefined ? (mapping.isRequired ? 'Required' : 'Optional') : '',
            mapping.competency?.definition || mapping.description || ''
          ]);
        });
      }
      
      // Convert to CSV format (simple Excel export)
      const csvContent = excelData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Add BOM for UTF-8 Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${job.code}_${job.title.replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Success',
        description: 'Excel file exported successfully!',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export Excel',
        variant: 'destructive'
      });
    }
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

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading job: {error?.message || 'Job not found'}</p>
          <Button onClick={() => navigate('/jobs')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/jobs')}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Briefcase className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{job.title}</h1>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-white/20 backdrop-blur-sm">
                      {job.code}
                    </span>
                    {job.grade && (
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-white/20 backdrop-blur-sm">
                        Grade {job.grade}
                      </span>
                    )}
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      job.isActive ? 'bg-green-500/30' : 'bg-red-500/30'
                    }`}>
                      {job.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={() => navigate(`/jobs/edit/${job.id}`)}
                className="bg-white text-blue-600 hover:bg-white/90"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Job
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8" id="job-content">
        <div className="space-y-6">
          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Job Code</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{job.code}</p>
                  </div>
                  {(job.jcp_code || job.jcpCode) && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">JCP Code</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">{job.jcp_code || job.jcpCode}</p>
                    </div>
                  )}
                  {job.division && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Division</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">{job.division}</p>
                    </div>
                  )}
                  {job.department && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Department</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">{job.department}</p>
                    </div>
                  )}
                  {job.section && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Section</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">{job.section}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {job.unit && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Unit</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">{job.unit}</p>
                    </div>
                  )}
                  {job.location && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Location</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">{job.location}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Created Date</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">
                      {new Date(job.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">
                      {new Date(job.updatedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
              {job.description && (
                <div className="mt-6 pt-6 border-t">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Description</Label>
                  <p className="text-base text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{job.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Description (JD) */}
          {(job.budgetaryControl !== undefined || job.externalInterfaces || 
            job.internalInterfaces || job.jobScope || job.accountabilities || 
            job.qualificationsExperience || job.restrictions || job.authority || 
            job.demands) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Job Description (JD)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Dimensions */}
                {(job.budgetaryControl !== undefined || job.externalInterfaces || job.internalInterfaces) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Dimensions</h3>
                    <div className="space-y-4">
                      {job.budgetaryControl !== undefined && (
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-base font-semibold text-gray-900">Budgetary Control:</span>
                          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            job.budgetaryControl 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {job.budgetaryControl ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {job.externalInterfaces && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-base font-semibold text-gray-900 block mb-3">External Interfaces:</span>
                          <ul className="list-disc list-inside space-y-2 text-base text-gray-700">
                            {job.externalInterfaces.split(',').map((item, idx) => (
                              <li key={idx} className="ml-4">{item.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {job.internalInterfaces && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-base font-semibold text-gray-900 block mb-3">Internal Interfaces:</span>
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{job.internalInterfaces}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Core JD Fields */}
                {(job.jobScope || job.accountabilities || job.qualificationsExperience) && (
                  <div className="space-y-6">
                    {job.jobScope && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Scope</h3>
                        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{job.jobScope}</p>
                        </div>
                      </div>
                    )}
                    {job.accountabilities && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Accountabilities</h3>
                        <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{job.accountabilities}</p>
                        </div>
                      </div>
                    )}
                    {job.qualificationsExperience && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Qualifications and Experience</h3>
                        <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{job.qualificationsExperience}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Special Conditions */}
                {(job.restrictions || job.authority || job.demands) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Conditions That May Apply</h3>
                    <div className="space-y-4">
                      {job.restrictions && (
                        <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            Restrictions
                          </h4>
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{job.restrictions}</p>
                        </div>
                      )}
                      {job.authority && (
                        <div className="p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-indigo-600" />
                            Authority
                          </h4>
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{job.authority}</p>
                        </div>
                      )}
                      {job.demands && (
                        <div className="p-6 bg-orange-50 rounded-lg border border-orange-200">
                          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-600" />
                            Demands
                          </h4>
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{job.demands}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Competency Profile */}
          {jcpMappings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Competency Profile ({jcpMappings.length} competencies)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jcpMappings.map((mapping) => (
                    <div key={mapping.id || `${mapping.jobId}-${mapping.competencyId}`} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {mapping.competency_name || mapping.competency?.name || `Competency ${mapping.competencyId}`}
                          </h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {mapping.competency?.type && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {mapping.competency.type}
                              </span>
                            )}
                            {(mapping.competency_family || mapping.competency?.family) && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                {mapping.competency_family || mapping.competency?.family}
                              </span>
                            )}
                          </div>
                          {mapping.competency?.definition && (
                            <p className="text-sm text-gray-700 leading-relaxed mt-2">{mapping.competency.definition}</p>
                          )}
                        </div>
                        <div className="ml-4 flex flex-col items-end gap-2">
                          <span className="px-3 py-1.5 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                            Required Level: {mapping.requiredLevel || mapping.required_level || 'N/A'}
                          </span>
                          {mapping.isRequired !== undefined && (
                            <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
                              mapping.isRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {mapping.isRequired ? 'Required' : 'Optional'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewJob;

