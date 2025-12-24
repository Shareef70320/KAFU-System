import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import jsPDF from 'jspdf';
import { 
  BookOpen, 
  Upload, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  FileText,
  Eye,
  Award,
  Target,
  TrendingUp,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText as Document,
  Star,
  Clock,
  AlertCircle,
  UserCheck,
  X,
  List
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import EmployeePhoto from '../components/EmployeePhoto';
import { getLevelDisplayName } from '../utils/competencyLevels';

const Competencies = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(''); // Search input for client-side filtering
  const [selectedType, setSelectedType] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedCompetency, setExpandedCompetency] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [showAssessorModal, setShowAssessorModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [assessors, setAssessors] = useState([]);
  const [assessorsLoading, setAssessorsLoading] = useState(false);
  const [showElementsModal, setShowElementsModal] = useState(false);
  const [selectedCompetencyForElements, setSelectedCompetencyForElements] = useState(null);
  const [levelElements, setLevelElements] = useState([]);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [activeLevelId, setActiveLevelId] = useState(null);
  const [expandedElementsModal, setExpandedElementsModal] = useState({}); // { elementId: true/false }
  const [showCompetencyViewModal, setShowCompetencyViewModal] = useState(false);
  const [viewCompetencyLoading, setViewCompetencyLoading] = useState(false);
  const [fullCompetencyView, setFullCompetencyView] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportType, setExportType] = useState('');
  const [exportFamily, setExportFamily] = useState('');
  const [exportDivision, setExportDivision] = useState('');
  const [exportFieldMode, setExportFieldMode] = useState('all'); // 'all' | 'selected'
  const [selectedExportFields, setSelectedExportFields] = useState([]);

  // Restore filters from sessionStorage on mount
  useEffect(() => {
    // 1) Restore from navigation state (coming back from EditCompetency)
    if (location.state && location.state.restoreFilters) {
      const f = location.state.restoreFilters;
      if (f.searchInput !== undefined) setSearchInput(f.searchInput);
      if (f.selectedType !== undefined) setSelectedType(f.selectedType);
      if (f.selectedFamily !== undefined) setSelectedFamily(f.selectedFamily);
      if (f.selectedDivision !== undefined) setSelectedDivision(f.selectedDivision);

      // Clear state in history so back/forward doesn't keep re-applying
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    // 2) Otherwise restore from sessionStorage (normal refresh / revisit)
    try {
      const stored = sessionStorage.getItem('competencyFrameworkFilters');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.searchInput !== undefined) setSearchInput(parsed.searchInput);
        if (parsed.selectedType !== undefined) setSelectedType(parsed.selectedType);
        if (parsed.selectedFamily !== undefined) setSelectedFamily(parsed.selectedFamily);
        if (parsed.selectedDivision !== undefined) setSelectedDivision(parsed.selectedDivision);
      }
    } catch (e) {
      console.error('Failed to restore competency filters from sessionStorage', e);
    }
  }, []);

  // Persist filters to sessionStorage whenever they change
  useEffect(() => {
    try {
      const payload = {
        searchInput,
        selectedType,
        selectedFamily,
        selectedDivision,
      };
      sessionStorage.setItem('competencyFrameworkFilters', JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save competency filters to sessionStorage', e);
    }
  }, [searchInput, selectedType, selectedFamily, selectedDivision]);
  const searchInputRef = useRef(null);

  // These will be populated from actual data
  const [competencyTypes, setCompetencyTypes] = useState([]);
  const [competencyFamilies, setCompetencyFamilies] = useState([]);

  const EXPORT_FIELDS = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'family', label: 'Family' },
    { key: 'related_division', label: 'Related Division' },
    { key: 'definition', label: 'Definition' },
    { key: 'description', label: 'Description' },
    { key: 'isActive', label: 'Is Active' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'updatedAt', label: 'Updated At' },
    // Level details (description + elements + indicators in one cell per level)
    { key: 'LEVEL_BASIC', label: 'Aware Level (BASIC)' },
    { key: 'LEVEL_INTERMEDIATE', label: 'Knowledge Level (INTERMEDIATE)' },
    { key: 'LEVEL_ADVANCED', label: 'Skilled Level (ADVANCED)' },
    { key: 'LEVEL_MASTERY', label: 'Mastery Level (MASTERY)' },
  ];

  // All available types
  const allTypes = [
    'TECHNICAL',
    'NON_TECHNICAL',
    'BEHAVIORAL',
    'LEADERSHIP',
    'FUNCTIONAL',
    'CERTIFICATION_AND_COMPLIANCE',
    'COMMERCIAL',
    'FINANCE_AND_PROCUREMENT',
    'FIRE',
    'HR_AND_ADMIN',
    'HSE',
    'ICT',
    'INTERNAL_AUDIT',
    'LEGAL_AND_REGULATORY',
    'MAINTENANCE',
    'MEDIA',
    'OPERATIONS',
    'QUALITY',
    'SECURITY',
    'TECHNICAL_SERVICES'
  ];

  // No debouncing needed - client-side filtering is instant

  // Maintain focus after re-renders
  useEffect(() => {
    if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
      // Only refocus if the user was previously typing in the search box
      const wasSearching = searchInput.length > 0;
      if (wasSearching) {
        searchInputRef.current.focus();
      }
    }
  });

  // Fetch all competencies from API (no filtering on server side)
  const { data: competenciesData, isLoading, isError, error } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies', {
        params: {
          page: 1,
          limit: 1000
        }
      });
      return response.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const competencies = competenciesData?.competencies || [];
  
  // Calculate statistics locally
  const stats = React.useMemo(() => {
    if (!competencies.length) return { 
      total: 0, 
      active: 0, 
      families: [], 
      types: [],
      totalAssessments: 0,
      divisions: [],
    };
    
    const total = competencies.length;
    const active = competencies.filter(c => c.isActive).length;
    
    const types = [...new Set(competencies.map(c => c.type).filter(Boolean))].map(type => ({
      type,
      count: competencies.filter(c => c.type === type).length
    }));
    
    const families = [...new Set(competencies.map(c => c.family).filter(Boolean))].map(family => ({
      family,
      count: competencies.filter(c => c.family === family).length
    }));
    
    // Calculate total assessments from all competencies
    const totalAssessments = competencies.reduce((sum, c) => sum + (c._count?.assessments || 0), 0);

    // Unique related divisions
    const divisions = [...new Set(
      competencies
        .map(c => c.related_division || c.relatedDivision)
        .filter(Boolean)
    )];
    
    return { 
      total, 
      active, 
      types, 
      families, 
      totalAssessments,
      divisions,
    };
  }, [competencies]);

  // Calculate available filter options based on current selections
  const availableTypes = useMemo(() => {
    if (!competencies.length) return [];
    
    let filtered = competencies;
    
    // If family is selected, only show types that have that family
    if (selectedFamily) {
      filtered = filtered.filter(c => c.family === selectedFamily);
    }
    
    // If division is selected, only show types that have that division
    if (selectedDivision) {
      filtered = filtered.filter(c => c.related_division === selectedDivision || c.relatedDivision === selectedDivision);
    }
    
    return [...new Set(filtered.map(c => c.type).filter(Boolean))].sort();
  }, [competencies, selectedFamily, selectedDivision]);
  
  const availableFamilies = useMemo(() => {
    if (!competencies.length) return [];
    
    let filtered = competencies;
    
    // If type is selected, only show families that belong to that type
    if (selectedType) {
      filtered = filtered.filter(c => c.type === selectedType);
    }
    
    // If division is selected, only show families that have that division
    if (selectedDivision) {
      filtered = filtered.filter(c => c.related_division === selectedDivision || c.relatedDivision === selectedDivision);
    }
    
    return [...new Set(filtered.map(c => c.family).filter(Boolean))].sort();
  }, [competencies, selectedType, selectedDivision]);
  
  const availableDivisions = useMemo(() => {
    if (!competencies.length) return [];
    
    let filtered = competencies;
    
    // If type is selected, only show divisions that belong to that type
    if (selectedType) {
      filtered = filtered.filter(c => c.type === selectedType);
    }
    
    // If family is selected, only show divisions that belong to that family
    if (selectedFamily) {
      filtered = filtered.filter(c => c.family === selectedFamily);
    }
    
    return [...new Set(filtered.map(c => c.related_division || c.relatedDivision).filter(Boolean))].sort();
  }, [competencies, selectedType, selectedFamily]);
  
  // Populate filter options from stats data (for initial load)
  useEffect(() => {
    if (stats.types && stats.families) {
      // Get unique types from stats
      const uniqueTypes = stats.types.map(t => t.type);
      setCompetencyTypes(uniqueTypes);
      
      // Get unique families from stats
      const uniqueFamilies = stats.families.map(f => f.family);
      setCompetencyFamilies(uniqueFamilies);
    }
  }, [stats]);
  
  // Reset family when type changes (if current family is not available for new type)
  useEffect(() => {
    if (selectedType && selectedFamily) {
      const familyExists = competencies.some(c => c.type === selectedType && c.family === selectedFamily);
      if (!familyExists) {
        setSelectedFamily('');
      }
    }
  }, [selectedType, competencies, selectedFamily]);
  
  // Reset type when family changes (if current type is not available for new family)
  useEffect(() => {
    if (selectedFamily && selectedType) {
      const typeExists = competencies.some(c => c.type === selectedType && c.family === selectedFamily);
      if (!typeExists) {
        setSelectedType('');
      }
    }
  }, [selectedFamily, competencies, selectedType]);
  
  // Reset division when type or family changes (if current division is not available)
  useEffect(() => {
    if (selectedDivision) {
      const divisionExists = competencies.some(c => {
        const matchesType = !selectedType || c.type === selectedType;
        const matchesFamily = !selectedFamily || c.family === selectedFamily;
        const matchesDivision = (c.related_division === selectedDivision || c.relatedDivision === selectedDivision);
        return matchesType && matchesFamily && matchesDivision;
      });
      if (!divisionExists) {
        setSelectedDivision('');
      }
    }
  }, [selectedType, selectedFamily, competencies, selectedDivision]);

  const handleFileUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload/competencies', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setUploadResults(response.data.summary);
      toast({
        title: 'Upload Successful',
        description: response.data.message,
        variant: 'success',
      });
      
      // Refresh the competencies list
      queryClient.invalidateQueries(['competencies']);
      queryClient.invalidateQueries(['competency-stats']);
      
      setShowUploadModal(false);
      setFile(null);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: err.response?.data?.message || 'An error occurred during upload.',
        variant: 'destructive',
      });
      setUploadResults({
        total: 0,
        successful: 0,
        errors: 1,
        details: err.response?.data?.results || [],
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'TECHNICAL':
        return 'bg-blue-100 text-blue-800';
      case 'NON_TECHNICAL':
        return 'bg-green-100 text-green-800';
      case 'BEHAVIORAL':
        return 'bg-purple-100 text-purple-800';
      case 'LEADERSHIP':
        return 'bg-orange-100 text-orange-800';
      case 'FUNCTIONAL':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFamilyColor = (family) => {
    switch (family) {
      case 'Operations':
        return 'bg-red-100 text-red-800';
      case 'Maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'Technical Services':
        return 'bg-blue-100 text-blue-800';
      case 'Media':
        return 'bg-purple-100 text-purple-800';
      case 'HR & Admin':
        return 'bg-green-100 text-green-800';
      case 'Certification & Compliance':
        return 'bg-yellow-100 text-yellow-800';
      case 'Fire':
        return 'bg-red-200 text-red-900';
      case 'Security':
        return 'bg-gray-100 text-gray-800';
      case 'Finance & Procurement':
        return 'bg-emerald-100 text-emerald-800';
      case 'Quality':
        return 'bg-indigo-100 text-indigo-800';
      case 'HSE':
        return 'bg-teal-100 text-teal-800';
      case 'ICT':
        return 'bg-cyan-100 text-cyan-800';
      case 'Common':
        return 'bg-slate-100 text-slate-800';
      case 'Legal & Regulatory':
        return 'bg-rose-100 text-rose-800';
      case 'Internal Audit':
        return 'bg-violet-100 text-violet-800';
      case 'Commercial':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredExportData = () => {
    let data = competencies;
    if (exportType) {
      data = data.filter(c => c.type === exportType);
    }
    if (exportFamily) {
      data = data.filter(c => c.family === exportFamily);
    }
    if (exportDivision) {
      data = data.filter(
        c => (c.related_division || c.relatedDivision) === exportDivision
      );
    }
    return data;
  };

  const buildLevelCell = (competency, levelCode) => {
    if (!competency.levels || !Array.isArray(competency.levels)) return '';
    const level = competency.levels.find((lvl) => lvl.level === levelCode);
    if (!level) return '';

    const parts = [];

    if (level.description) {
      parts.push(`Description: ${level.description}`);
    }

    if (Array.isArray(level.indicators) && level.indicators.length > 0) {
      parts.push('Level indicators:');
      level.indicators.forEach((ind, idx) => {
        const text = (ind || '').toString().trim();
        if (text) {
          parts.push(`  ${idx + 1}) ${text}`);
        }
      });
    }

    if (Array.isArray(level.elements) && level.elements.length > 0) {
      parts.push('Elements:');
      level.elements.forEach((el, idx) => {
        const elementName = (el?.name || '').toString().trim();
        if (!elementName) return;

        // Numbered element line
        parts.push(`${idx + 1}. ${elementName}`);

        // Bulleted indicators for this element
        if (Array.isArray(el.performanceIndicators) && el.performanceIndicators.length > 0) {
          el.performanceIndicators.forEach((pi) => {
            const action = (pi?.action || '').toString().trim();
            if (action) {
              parts.push(`   - ${action}`);
            }
          });
        }
      });
    }

    return parts.join('\n');
  };

  const handleExport = () => {
    const data = getFilteredExportData();
    if (!data.length) {
      toast({
        title: 'No data to export',
        description: 'No competencies match the selected export filters.',
        variant: 'destructive',
      });
      return;
    }

    const fields =
      exportFieldMode === 'all'
        ? EXPORT_FIELDS
        : EXPORT_FIELDS.filter(f => selectedExportFields.includes(f.key));

    if (!fields.length) {
      toast({
        title: 'No fields selected',
        description: 'Please select at least one field to export.',
        variant: 'destructive',
      });
      return;
    }

    if (exportFormat === 'json') {
      const simplified = data.map(c => {
        const row = {};
        fields.forEach(({ key }) => {
          if (key === 'related_division') {
            row[key] = c.related_division || c.relatedDivision || null;
          } else if (key === 'LEVEL_BASIC') {
            row[key] = buildLevelCell(c, 'BASIC');
          } else if (key === 'LEVEL_INTERMEDIATE') {
            row[key] = buildLevelCell(c, 'INTERMEDIATE');
          } else if (key === 'LEVEL_ADVANCED') {
            row[key] = buildLevelCell(c, 'ADVANCED');
          } else if (key === 'LEVEL_MASTERY') {
            row[key] = buildLevelCell(c, 'MASTERY');
          } else {
            row[key] = c[key] ?? null;
          }
        });
        return row;
      });
      const blob = new Blob([JSON.stringify(simplified, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `competencies_export_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'html') {
      // HTML editor export (self-contained HTML + JS with CRUD and CSV download)
      const dateStr = new Date().toISOString().slice(0, 10);

      // Build simplified rows with selected fields, including level text
      // For HTML export we embed ALL competencies so the OA tab can always see the full dictionary,
      // while the Edit tab will apply the selected export filters on top of this data.
      const allSource = Array.isArray(competencies) && competencies.length ? competencies : data;
      const rows = allSource.map((c) => {
        const row = {};
        fields.forEach(({ key }) => {
          if (key === 'related_division') {
            row[key] = c.related_division || c.relatedDivision || '';
          } else if (key === 'createdAt' || key === 'updatedAt') {
            row[key] = c[key] ? new Date(c[key]).toISOString() : '';
          } else if (key === 'LEVEL_BASIC') {
            row[key] = buildLevelCell(c, 'BASIC');
          } else if (key === 'LEVEL_INTERMEDIATE') {
            row[key] = buildLevelCell(c, 'INTERMEDIATE');
          } else if (key === 'LEVEL_ADVANCED') {
            row[key] = buildLevelCell(c, 'ADVANCED');
          } else if (key === 'LEVEL_MASTERY') {
            row[key] = buildLevelCell(c, 'MASTERY');
          } else {
            row[key] = c[key] ?? '';
          }
        });
        return row;
      });

      const fieldMeta = fields.map((f) => ({ key: f.key, label: f.label }));
      const htmlTitleBase = 'Oman Airports Competency Dictionary';
      const htmlTitle =
        exportDivision && exportDivision.length > 0
          ? `${htmlTitleBase} - ${exportDivision}`
          : htmlTitleBase;

      // Summary numbers (from original data, not dynamic after edits)
      const totalCompetencies = data.length;
      let totalElements = 0;
      let totalIndicators = 0;
      data.forEach((c) => {
        if (Array.isArray(c.levels)) {
          c.levels.forEach((lvl) => {
            const elements = Array.isArray(lvl.elements) ? lvl.elements : [];
            totalElements += elements.length;
            elements.forEach((el) => {
              if (Array.isArray(el.performanceIndicators)) {
                totalIndicators += el.performanceIndicators.length;
              }
            });
          });
        }
      });

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${htmlTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 28px; background: radial-gradient(circle at top left, #e0f2fe, #f9fafb 40%, #f3e8ff 100%); font-size: 14px; }
    h1 { font-size: 24px; margin-bottom: 6px; color: #111827; }
    h2 { font-size: 15px; margin-top: 0; color: #6b7280; }
    .page-shell { max-width: 1200px; margin: 0 auto; }
    .card { background: #ffffff; border-radius: 18px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12); padding: 20px 24px 24px; border: 1px solid rgba(226, 232, 240, 0.9); backdrop-filter: blur(6px); }
    .card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .card-title-block { display: flex; flex-direction: column; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
    .badge-division { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; box-shadow: 0 0 0 1px rgba(191, 219, 254, 0.6); }
    .meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .help-box { margin-top: 10px; padding: 8px 10px; border-radius: 10px; background: #ecfdf5; border: 1px solid #bbf7d0; font-size: 12px; color: #065f46; }
    .help-title { font-weight: 600; margin-bottom: 2px; }
    .help-list { margin: 0; padding-left: 16px; }
    .help-list li { margin-bottom: 2px; }
    .summary-grid { margin-top: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
    .summary-card { border-radius: 12px; padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06); position: relative; overflow: hidden; }
    .summary-card::before { content: ''; position: absolute; inset: -1px; opacity: 0.6; background: linear-gradient(135deg, rgba(37,99,235,0.15), rgba(16,185,129,0.12)); z-index: -1; }
    .summary-card:nth-child(1)::before { background: linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,197,253,0.12)); }
    .summary-card:nth-child(2)::before { background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(190,242,100,0.15)); }
    .summary-card:nth-child(3)::before { background: linear-gradient(135deg, rgba(249,115,22,0.25), rgba(251,191,36,0.18)); }
    .summary-label { font-size: 12px; font-weight: 500; color: #4b5563; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-value { font-size: 20px; font-weight: 700; color: #111827; }
    .toolbar { margin: 16px 0 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; }
    button { padding: 7px 12px; border-radius: 999px; border: 1px solid #d1d5db; background: #ffffff; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
    button.primary { background: #2563eb; color: white; border-color: #2563eb; }
    button.danger { background: #dc2626; color: white; border-color: #b91c1c; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .cards-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
    .comp-card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 10px 12px; background: linear-gradient(to right, #ffffff, #f9fafb); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06); cursor: default; transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease; }
    .comp-card:hover { box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12); transform: translateY(-1px); border-color: #c7d2fe; }
    .comp-card.selected { box-shadow: 0 0 0 2px #2563eb33; border-color: #2563eb; }
    .comp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .comp-title { font-size: 15px; font-weight: 600; color: #0f172a; }
    .comp-subtitle { font-size: 12px; color: #6b7280; }
    .comp-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
    .badge-small { background: #eff6ff; color: #1d4ed8; padding: 2px 7px; border-radius: 999px; font-size: 11px; border: 1px solid #bfdbfe; }
    .fields-grid { display: grid; grid-template-columns: 1fr; gap: 5px; }
    .comp-field { font-size: 13px; }
    .comp-field-label { font-weight: 500; color: #1f2937; margin-right: 4px; }
    .comp-field-value { display: inline-block; min-height: 16px; padding: 3px 5px; border-radius: 4px; background: #fffbeb; border: 1px dashed #e5e7eb; }
    .comp-field-value[contenteditable="true"]:focus { outline: 1px solid #2563eb; background: #eff6ff; }
    .comp-level-container { margin-top: 2px; padding: 7px 9px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 13px; }
    .comp-level-desc { margin-bottom: 4px; white-space: normal; line-height: 1.5; color: #111827; }
    .comp-level-toggle { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 4px; font-size: 11px; color: #2563eb; cursor: pointer; background: transparent; border: none; padding: 0; text-decoration: underline; }
    .comp-level-list { border-top: 1px dashed #e5e7eb; margin-top: 4px; padding-top: 4px; white-space: pre-wrap; line-height: 1.5; color: #374151; min-height: 14px; }
    .comp-level-list[contenteditable="true"]:focus { outline: 1px solid #2563eb; background: #eff6ff; }
    .field-key { font-family: ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
    .tabs { display: flex; gap: 4px; margin: 16px 0 12px; border-bottom: 2px solid #e5e7eb; }
    .tab-btn { padding: 8px 16px; border: none; background: transparent; color: #6b7280; font-size: 14px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
    .tab-btn:hover { color: #2563eb; }
    .tab-btn.active { color: #2563eb; border-bottom-color: #2563eb; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <div class="page-shell">
    <div class="card">
      <div class="card-header">
        <div class="card-title-block">
          <h1>${htmlTitle}</h1>
          <h2>Interactive competency dictionary editor – exported on ${dateStr}</h2>
          <div class="meta">This view is read‑only for structure (code, name, type, division) and editable for descriptive fields.</div>
          <div class="help-box" id="help-box">
            <div class="help-title">How to edit and save:</div>
            <ul class="help-list">
              <li>Click inside any highlighted field to edit the <strong>competency description</strong> or <strong>level descriptions</strong>.</li>
              <li>For each level, use the text under the label to change the <strong>level description</strong>.</li>
              <li>Click “Show elements &amp; indicators” to expand, then edit or add <strong>elements</strong> (numbered lines) and <strong>indicators</strong> (lines starting with “-”).</li>
              <li>When finished, click <strong>“Download CSV”</strong> to save all changes into a CSV file that can be imported back to the system.</li>
            </ul>
          </div>
        </div>
        ${
          exportDivision
            ? `<span class="badge badge-division">${exportDivision}</span>`
            : ''
        }
      </div>
      <!-- Edit tab statistics (based on initially selected subset) -->
      <div class="summary-grid" id="summary-edit">
        <div class="summary-card">
          <div class="summary-label">Competencies (Edit)</div>
          <div class="summary-value" id="edit-summary-competencies">${totalCompetencies}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Elements (Edit)</div>
          <div class="summary-value" id="edit-summary-elements">${totalElements}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Indicators (Edit)</div>
          <div class="summary-value" id="edit-summary-indicators">${totalIndicators}</div>
        </div>
      </div>
      <div class="toolbar">
        <button id="load-csv">↻ Load CSV</button>
        <button id="download-csv" class="primary">⬇ Download CSV</button>
        <input id="csv-file-input" type="file" accept=".csv,text/csv" style="display:none" />
      </div>
      <div class="tabs">
        <button class="tab-btn active" data-tab="edit">${exportDivision || 'Edit'}</button>
        <button class="tab-btn" data-tab="view">OA Competency</button>
      </div>
      <div class="tab-content active" id="tab-edit">
        <div class="cards-grid" id="cards-container"></div>
      </div>
      <div class="tab-content" id="tab-view">
        <!-- OA tab statistics (based on filtered view results) -->
        <div class="summary-grid" id="summary-view">
          <div class="summary-card">
            <div class="summary-label">Competencies (OA)</div>
            <div class="summary-value" id="view-summary-competencies">0</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Elements (OA)</div>
            <div class="summary-value" id="view-summary-elements">0</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Indicators (OA)</div>
            <div class="summary-value" id="view-summary-indicators">0</div>
          </div>
        </div>
        <div style="margin: 12px 0 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
          <label style="font-size: 13px; font-weight: 500; color: #4b5563;">Filters:</label>
          <select id="filter-type" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 12px; background: #ffffff;">
            <option value="">All Types</option>
          </select>
          <select id="filter-family" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 12px; background: #ffffff;">
            <option value="">All Families</option>
          </select>
          <select id="filter-division" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 12px; background: #ffffff;">
            <option value="">All Divisions</option>
          </select>
        </div>
        <div class="cards-grid" id="view-cards-container"></div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const fieldMeta = ${JSON.stringify(fieldMeta)};
      const rows = ${JSON.stringify(rows)};
      const initialEditFilter = ${JSON.stringify({
        type: exportType || '',
        family: exportFamily || '',
        division: exportDivision || '',
      })};

      const cardsContainer = document.getElementById('cards-container');
      const viewCardsContainer = document.getElementById('view-cards-container');
      const downloadCsvBtn = document.getElementById('download-csv');
      const loadCsvBtn = document.getElementById('load-csv');
      const csvFileInput = document.getElementById('csv-file-input');
      const tabButtons = document.querySelectorAll('.tab-btn');
      const tabContents = document.querySelectorAll('.tab-content');
      const filterType = document.getElementById('filter-type');
      const filterFamily = document.getElementById('filter-family');
      const filterDivision = document.getElementById('filter-division');

      // Populate filter dropdowns with unique values (for OA tab)
      function populateFilters() {
        const types = new Set();
        const families = new Set();
        const divisions = new Set();

        rows.forEach(row => {
          const typeField = fieldMeta.find(f => f.key === 'type');
          const familyField = fieldMeta.find(f => f.key === 'family');
          const divField = fieldMeta.find(f => f.key === 'related_division');
          
          if (typeField) {
            const val = getField(row, 'type');
            if (val) types.add(val);
          }
          if (familyField) {
            const val = getField(row, 'family');
            if (val) families.add(val);
          }
          if (divField) {
            const val = getField(row, 'related_division');
            if (val) divisions.add(val);
          }
        });

        // Populate Type filter
        Array.from(types).sort().forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          filterType.appendChild(opt);
        });

        // Populate Family filter
        Array.from(families).sort().forEach(f => {
          const opt = document.createElement('option');
          opt.value = f;
          opt.textContent = f;
          filterFamily.appendChild(opt);
        });

        // Populate Division filter
        Array.from(divisions).sort().forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = d;
          filterDivision.appendChild(opt);
        });
      }

      // Nested filter behavior for OA tab
      filterType.addEventListener('change', function () {
        // When type changes, rebuild family & division options based on that type
        const selectedType = filterType.value;

        // Reset family and division options
        filterFamily.innerHTML = '<option value=\"\">All Families</option>';
        filterDivision.innerHTML = '<option value=\"\">All Divisions</option>';

        const families = new Set();
        const divisions = new Set();

        rows.forEach(row => {
          const rowType = getField(row, 'type');
          if (selectedType && rowType !== selectedType) return;

          const fam = getField(row, 'family');
          const div = getField(row, 'related_division');
          if (fam) families.add(fam);
          if (div) divisions.add(div);
        });

        Array.from(families).sort().forEach(f => {
          const opt = document.createElement('option');
          opt.value = f;
          opt.textContent = f;
          filterFamily.appendChild(opt);
        });

        Array.from(divisions).sort().forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = d;
          filterDivision.appendChild(opt);
        });

        renderViewCards();
      });

      filterFamily.addEventListener('change', function () {
        // When family changes, rebuild division options based on type + family
        const selectedType = filterType.value;
        const selectedFamily = filterFamily.value;

        filterDivision.innerHTML = '<option value=\"\">All Divisions</option>';
        const divisions = new Set();

        rows.forEach(row => {
          const rowType = getField(row, 'type');
          const rowFamily = getField(row, 'family');
          if (selectedType && rowType !== selectedType) return;
          if (selectedFamily && rowFamily !== selectedFamily) return;
          const div = getField(row, 'related_division');
          if (div) divisions.add(div);
        });

        Array.from(divisions).sort().forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = d;
          filterDivision.appendChild(opt);
        });

        renderViewCards();
      });

      filterDivision.addEventListener('change', renderViewCards);

      const helpBox = document.getElementById('help-box');
      const summaryEdit = document.getElementById('summary-edit');
      
      // Tab switching
      tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const targetTab = this.dataset.tab;
          tabButtons.forEach(b => b.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));
          this.classList.add('active');
          document.getElementById('tab-' + targetTab).classList.add('active');
          // Show/hide help box and edit summary based on tab
          if (targetTab === 'view') {
            if (helpBox) helpBox.style.display = 'none';
            if (summaryEdit) summaryEdit.style.display = 'none';
            renderViewCards();
          } else {
            if (helpBox) helpBox.style.display = 'block';
            if (summaryEdit) summaryEdit.style.display = 'grid';
          }
        });
      });

      function getField(row, key) {
        return row[key] != null ? row[key] : '';
      }

      function renderCards() {
        cardsContainer.innerHTML = '';

        // Attach original indices so we can update the correct row in the backing array
        const indexedRows = rows.map((row, idx) => ({ row, rowIndex: idx }));

        // Apply initial edit filters (from export settings)
        const subset = indexedRows.filter(({ row }) => {
          if (initialEditFilter.type) {
            const rowType = getField(row, 'type');
            if (rowType !== initialEditFilter.type) return false;
          }
          if (initialEditFilter.family) {
            const rowFamily = getField(row, 'family');
            if (rowFamily !== initialEditFilter.family) return false;
          }
          if (initialEditFilter.division) {
            const rowDiv = getField(row, 'related_division');
            if (rowDiv !== initialEditFilter.division) return false;
          }
          return true;
        });

        subset.forEach(({ row, rowIndex }, index) => {
          const card = document.createElement('div');
          card.className = 'comp-card';

          // Header
          const header = document.createElement('div');
          header.className = 'comp-header';

          const headerLeft = document.createElement('div');
          const title = document.createElement('div');
          title.className = 'comp-title';
          const nameField = fieldMeta.find(f => f.key === 'name');
          const codeField = fieldMeta.find(f => f.key === 'code');
          const name = nameField ? getField(row, 'name') || 'Untitled competency' : 'Untitled competency';
          title.textContent = (index + 1) + '. ' + name;
          headerLeft.appendChild(title);

          // Subtitle (type/family/code) intentionally hidden in HTML export

          header.appendChild(headerLeft);

          card.appendChild(header);

          // Badges row (related division only – hide active status)
          const badgesRow = document.createElement('div');
          badgesRow.className = 'comp-badges';
          const divField = fieldMeta.find(f => f.key === 'related_division');
          if (divField && getField(row, 'related_division')) {
            const divBadge = document.createElement('span');
            divBadge.className = 'badge-small';
            divBadge.textContent = getField(row, 'related_division');
            badgesRow.appendChild(divBadge);
          }
          if (badgesRow.childNodes.length > 0) {
            card.appendChild(badgesRow);
          }

          // Fields grid (all selected fields except structural ones)
          const fieldsGrid = document.createElement('div');
          fieldsGrid.className = 'fields-grid';
          fieldMeta.forEach((field) => {
            // Skip structural and protected fields that should not be edited or shown
            if ([
              'code',
              'name',
              'type',
              'related_division',
              'description',
              'isActive',
              'createdAt',
              'updatedAt'
            ].includes(field.key)) {
              return;
            }
            const value = getField(row, field.key);
            const showAlways = ['definition', 'description'].includes(field.key);
            if (!showAlways && (!value || String(value).trim() === '')) {
              return;
            }
            const fieldRow = document.createElement('div');
            fieldRow.className = 'comp-field';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'comp-field-label';
            labelSpan.textContent = field.label + ':';

            const isLevelField = field.key.indexOf('LEVEL_') === 0;

            if (isLevelField) {
              // Container for level description + collapsible elements/indicators
              const container = document.createElement('div');
              container.className = 'comp-level-container';

              const raw = (value || '').toString();
              const lines = raw.split(/\\n+/);
              const descParts = [];
              const listLines = [];
              let afterElements = false;

              lines.forEach((line) => {
                const t = (line || '').trim();
                if (!t) return;

                if (t.startsWith('Description:')) {
                  // Strip the label, keep text
                  descParts.push(t.replace(/^Description:\\s*/i, ''));
                  return;
                }

                if (t.startsWith('Elements:')) {
                  // Everything after this goes into the collapsible division
                  afterElements = true;
                  return;
                }

                if (!afterElements) {
                  // Any text before "Elements:" (e.g. level indicators) stays with description
                  descParts.push(t);
                } else {
                  // Elements and indicators lines (already numbered / bulleted)
                  listLines.push(t);
                }
              });

              const descText = descParts.join(' ');
              const listText = listLines.join('\\n');

              const descBlock = document.createElement('div');
              descBlock.className = 'comp-level-desc';
              descBlock.contentEditable = 'true';
              descBlock.textContent = descText;

              const listBlock = document.createElement('div');
              listBlock.className = 'comp-level-list';
              listBlock.contentEditable = 'true';
              listBlock.style.display = 'none';
              listBlock.textContent = listText;

              const toggleBtn = document.createElement('button');
              toggleBtn.type = 'button';
              toggleBtn.className = 'comp-level-toggle';
              toggleBtn.textContent = listText ? 'Show elements & indicators' : 'No elements/indicators';

              // Action buttons for adding new element and indicator lines
              const actionsRow = document.createElement('div');
              actionsRow.style.marginTop = '4px';
              actionsRow.style.display = 'flex';
              actionsRow.style.gap = '6px';

              const addElementBtn = document.createElement('button');
              addElementBtn.type = 'button';
              addElementBtn.style.fontSize = '11px';
              addElementBtn.style.borderRadius = '999px';
              addElementBtn.style.border = '1px solid #9ca3af';
              addElementBtn.style.background = '#ffffff';
              addElementBtn.style.padding = '2px 8px';
              addElementBtn.textContent = '+ Add Element';

              const addIndicatorBtn = document.createElement('button');
              addIndicatorBtn.type = 'button';
              addIndicatorBtn.style.fontSize = '11px';
              addIndicatorBtn.style.borderRadius = '999px';
              addIndicatorBtn.style.border = '1px solid #9ca3af';
              addIndicatorBtn.style.background = '#ffffff';
              addIndicatorBtn.style.padding = '2px 8px';
              addIndicatorBtn.textContent = '• Add Indicator';

              function updateValue() {
                const d = descBlock.textContent.trim();
                const l = listBlock.textContent.replace(/\\r/g, '').trim();
                const combinedLines = [];
                if (d) combinedLines.push('Description: ' + d);
                if (l) {
                  combinedLines.push('Elements:');
                  const plines = l.split(/\\n+/);
                  plines.forEach((ln) => {
                    if (ln.trim()) combinedLines.push(ln);
                  });
                }
                rows[rowIndex][field.key] = combinedLines.join('\\n');
              }

              descBlock.addEventListener('input', updateValue);
              listBlock.addEventListener('input', updateValue);

              addElementBtn.addEventListener('click', function () {
                // Determine next element number based on existing numbered lines
                const current = listBlock.textContent.replace(/\\r/g, '');
                const lines = current.split(/\\n+/).filter(ln => ln.trim() !== '');
                let maxNum = 0;
                lines.forEach((ln) => {
                  const m = ln.trim().match(/^(\\d+)\\./);
                  if (m) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n) && n > maxNum) maxNum = n;
                  }
                });
                const next = maxNum + 1;
                const prefix = next + '. ';
                const newText = (current ? current + '\\n' : '') + prefix;
                listBlock.textContent = newText;
                // Ensure the list is visible after adding a new element
                if (listBlock.style.display === 'none') {
                  listBlock.style.display = 'block';
                  toggleBtn.textContent = 'Hide elements & indicators';
                }
                // Set cursor focus at the end of the newly added line
                setTimeout(function() {
                  listBlock.focus();
                  const range = document.createRange();
                  const selection = window.getSelection();
                  range.selectNodeContents(listBlock);
                  range.collapse(false); // Collapse to end
                  selection.removeAllRanges();
                  selection.addRange(range);
                }, 10);
                updateValue();
              });

              addIndicatorBtn.addEventListener('click', function () {
                const current = listBlock.textContent.replace(/\\r/g, '');
                const newText = (current ? current + '\\n' : '') + '- ';
                listBlock.textContent = newText;
                // Ensure the list is visible after adding a new indicator
                if (listBlock.style.display === 'none') {
                  listBlock.style.display = 'block';
                  toggleBtn.textContent = 'Hide elements & indicators';
                }
                // Set cursor focus at the end of the newly added line
                setTimeout(function() {
                  listBlock.focus();
                  const range = document.createRange();
                  const selection = window.getSelection();
                  range.selectNodeContents(listBlock);
                  range.collapse(false); // Collapse to end
                  selection.removeAllRanges();
                  selection.addRange(range);
                }, 10);
                updateValue();
              });

              toggleBtn.addEventListener('click', function () {
                const isHidden = listBlock.style.display === 'none';
                listBlock.style.display = isHidden ? 'block' : 'none';
                toggleBtn.textContent = isHidden ? 'Hide elements & indicators' : 'Show elements & indicators';
              });

              container.appendChild(descBlock);
              container.appendChild(toggleBtn);
              container.appendChild(listBlock);
              actionsRow.appendChild(addElementBtn);
              actionsRow.appendChild(addIndicatorBtn);
              container.appendChild(actionsRow);

              fieldRow.appendChild(labelSpan);
              fieldRow.appendChild(container);
            } else {
              const valueSpan = document.createElement('span');
              valueSpan.className = 'comp-field-value';
              valueSpan.contentEditable = 'true';
              valueSpan.dataset.fieldKey = field.key;
              valueSpan.textContent = value;
              valueSpan.addEventListener('input', function() {
                rows[rowIndex][field.key] = valueSpan.textContent;
              });
              fieldRow.appendChild(labelSpan);
              fieldRow.appendChild(valueSpan);
            }
            fieldsGrid.appendChild(fieldRow);
          });

          card.appendChild(fieldsGrid);

          cardsContainer.appendChild(card);
        });
      }

      // Read-only view render function
      function renderViewCards() {
        viewCardsContainer.innerHTML = '';
        
        // Apply filters
        const selectedType = filterType.value;
        const selectedFamily = filterFamily.value;
        const selectedDivision = filterDivision.value;
        
        const filteredRows = rows.filter(row => {
          const typeField = fieldMeta.find(f => f.key === 'type');
          const familyField = fieldMeta.find(f => f.key === 'family');
          const divField = fieldMeta.find(f => f.key === 'related_division');
          
          if (selectedType) {
            const rowType = typeField ? getField(row, 'type') : '';
            if (rowType !== selectedType) return false;
          }
          if (selectedFamily) {
            const rowFamily = familyField ? getField(row, 'family') : '';
            if (rowFamily !== selectedFamily) return false;
          }
          if (selectedDivision) {
            const rowDiv = divField ? getField(row, 'related_division') : '';
            if (rowDiv !== selectedDivision) return false;
          }
          return true;
        });
        
        // Update OA summary cards based on filtered rows
        let competenciesCount = filteredRows.length;
        let elementsCount = 0;
        let indicatorsCount = 0;

        filteredRows.forEach((row) => {
          fieldMeta.forEach((field) => {
            if (field.key.indexOf('LEVEL_') !== 0) return;
            const val = row[field.key];
            if (!val) return;
            const lines = String(val).split(/\\n+/);
            let afterElements = false;
            lines.forEach((line) => {
              const t = (line || '').trim();
              if (!t) return;
              if (t.startsWith('Elements:')) {
                afterElements = true;
                return;
              }
              if (!afterElements) return;
              if (/^\\d+\\./.test(t)) {
                elementsCount += 1;
              }
            });
            // Count indicators separately (any line starting with '-')
            lines.forEach((line) => {
              const t = (line || '').trim();
              if (t.startsWith('-')) {
                indicatorsCount += 1;
              }
            });
          });
        });

        const compEl = document.getElementById('view-summary-competencies');
        const elemEl = document.getElementById('view-summary-elements');
        const indEl = document.getElementById('view-summary-indicators');
        if (compEl) compEl.textContent = String(competenciesCount);
        if (elemEl) elemEl.textContent = String(elementsCount);
        if (indEl) indEl.textContent = String(indicatorsCount);
        
        filteredRows.forEach((row, index) => {
          const card = document.createElement('div');
          card.className = 'comp-card';

          // Header
          const header = document.createElement('div');
          header.className = 'comp-header';

          const headerLeft = document.createElement('div');
          const title = document.createElement('div');
          title.className = 'comp-title';
          const nameField = fieldMeta.find(f => f.key === 'name');
          const name = nameField ? getField(row, 'name') || 'Untitled competency' : 'Untitled competency';
          title.textContent = (index + 1) + '. ' + name;
          headerLeft.appendChild(title);

          header.appendChild(headerLeft);
          card.appendChild(header);

          // Badges row
          const badgesRow = document.createElement('div');
          badgesRow.className = 'comp-badges';
          const divField = fieldMeta.find(f => f.key === 'related_division');
          if (divField && getField(row, 'related_division')) {
            const divBadge = document.createElement('span');
            divBadge.className = 'badge-small';
            divBadge.textContent = getField(row, 'related_division');
            badgesRow.appendChild(divBadge);
          }
          if (badgesRow.childNodes.length > 0) {
            card.appendChild(badgesRow);
          }

          // Fields grid (read-only)
          const fieldsGrid = document.createElement('div');
          fieldsGrid.className = 'fields-grid';
          fieldMeta.forEach((field) => {
            if ([
              'code',
              'name',
              'type',
              'related_division',
              'description',
              'isActive',
              'createdAt',
              'updatedAt'
            ].includes(field.key)) {
              return;
            }
            const value = getField(row, field.key);
            const showAlways = ['definition', 'description'].includes(field.key);
            if (!showAlways && (!value || String(value).trim() === '')) {
              return;
            }
            const fieldRow = document.createElement('div');
            fieldRow.className = 'comp-field';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'comp-field-label';
            labelSpan.textContent = field.label + ':';

            const isLevelField = field.key.indexOf('LEVEL_') === 0;

            if (isLevelField) {
              const container = document.createElement('div');
              container.className = 'comp-level-container';

              const raw = (value || '').toString();
              const lines = raw.split(/\\n+/);
              const descParts = [];
              const listLines = [];
              let afterElements = false;

              lines.forEach((line) => {
                const t = (line || '').trim();
                if (!t) return;

                if (t.startsWith('Description:')) {
                  descParts.push(t.replace(/^Description:\\s*/i, ''));
                  return;
                }

                if (t.startsWith('Elements:')) {
                  afterElements = true;
                  return;
                }

                if (!afterElements) {
                  descParts.push(t);
                } else {
                  listLines.push(t);
                }
              });

              const descText = descParts.join(' ');
              const listText = listLines.join('\\n');

              const descBlock = document.createElement('div');
              descBlock.className = 'comp-level-desc';
              descBlock.textContent = descText;

              if (listText) {
                const listBlock = document.createElement('div');
                listBlock.className = 'comp-level-list';
                listBlock.style.display = 'block';
                listBlock.textContent = listText;
                container.appendChild(descBlock);
                container.appendChild(listBlock);
              } else {
                container.appendChild(descBlock);
              }

              fieldRow.appendChild(labelSpan);
              fieldRow.appendChild(container);
            } else {
              const valueSpan = document.createElement('span');
              valueSpan.className = 'comp-field-value';
              valueSpan.textContent = value;
              fieldRow.appendChild(labelSpan);
              fieldRow.appendChild(valueSpan);
            }
            fieldsGrid.appendChild(fieldRow);
          });

          card.appendChild(fieldsGrid);
          viewCardsContainer.appendChild(card);
        });
      }

      function escapeCsvValue(value) {
        if (value == null) return '';
        const str = String(value);
        if (/[\",\\n]/.test(str)) {
          return '"' + str.replace(/\"/g, '\"\"') + '"';
        }
        return str;
      }

      // Simple CSV parser that supports quoted values and commas/newlines
      function parseCsv(text) {
        const rows = [];
        let current = [];
        let field = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (inQuotes) {
            if (c === '"') {
              const next = text[i + 1];
              if (next === '"') {
                field += '"';
                i++;
              } else {
                inQuotes = false;
              }
            } else {
              field += c;
            }
          } else {
            if (c === '"') {
              inQuotes = true;
            } else if (c === ',') {
              current.push(field);
              field = '';
            } else if (c === '\\n') {
              current.push(field);
              rows.push(current);
              current = [];
              field = '';
            } else if (c === '\\r') {
              // ignore
            } else {
              field += c;
            }
          }
        }
        if (field.length || current.length) {
          current.push(field);
          rows.push(current);
        }
        return rows;
      }

      loadCsvBtn.addEventListener('click', function () {
        if (!csvFileInput) return;
        csvFileInput.value = '';
        csvFileInput.click();
      });

      if (csvFileInput) {
        csvFileInput.addEventListener('change', function (e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function (evt) {
            try {
              const text = String(evt.target.result || '');
              const parsed = parseCsv(text);
              if (!parsed.length) return;
              const header = parsed[0];
              const bodyRows = parsed.slice(1).filter(r => r.some(c => String(c || '').trim() !== ''));

              const labelToKey = {};
              fieldMeta.forEach((f) => {
                labelToKey[f.label] = f.key;
              });

              const headerKeys = header.map((label) => labelToKey[label] || null);

              const newRows = bodyRows.map((cols) => {
                const obj = {};
                headerKeys.forEach((key, idx) => {
                  if (!key) return;
                  obj[key] = cols[idx] != null ? cols[idx] : '';
                });
                return obj;
              });

              // Replace rows content
              rows.length = 0;
              newRows.forEach((r) => rows.push(r));
              // Clear and repopulate filters
              filterType.innerHTML = '<option value="">All Types</option>';
              filterFamily.innerHTML = '<option value="">All Families</option>';
              filterDivision.innerHTML = '<option value="">All Divisions</option>';
              populateFilters();
              renderCards();
              renderViewCards();
            } catch (err) {
              console.error('Failed to load CSV into editor', err);
              alert('Could not load CSV. Please make sure you are using a file exported from this editor.');
            }
          };
          reader.readAsText(file);
        });
      }

      downloadCsvBtn.addEventListener('click', function() {
        const header = fieldMeta.map((f) => escapeCsvValue(f.label)).join(',');
        const csvRows = rows.map((row) => {
          return fieldMeta.map((f) => escapeCsvValue(row[f.key])).join(',');
        });
        const csvContent = [header].concat(csvRows).join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'competencies_edited_${dateStr}.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      populateFilters();
      renderCards();
      renderViewCards();
    })();
  </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], {
        type: 'text/html;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr2 = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `competencies_editor_${dateStr2}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'pdf') {
      // PDF Export with enhanced styling
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;
      let yPos = margin;
      const lineHeight = 7;
      const sectionSpacing = 5;

      // Color scheme
      const colors = {
        primary: [41, 128, 185],      // Blue
        secondary: [52, 73, 94],      // Dark gray
        success: [39, 174, 96],       // Green
        warning: [241, 196, 15],      // Yellow
        danger: [231, 76, 60],        // Red
        info: [52, 152, 219],         // Light blue
        aware: [149, 165, 166],       // Gray for Aware
        knowledge: [241, 196, 15],    // Yellow for Knowledge
        skilled: [52, 152, 219],      // Blue for Skilled
        mastery: [39, 174, 96],       // Green for Mastery
        lightBg: [236, 240, 241],     // Light gray background
        border: [189, 195, 199]        // Border gray
      };

      // Helper function to add colored box
      const addColoredBox = (x, y, width, height, color, text = '', fontSize = 10, isBold = false, textColor = [255, 255, 255]) => {
        doc.setFillColor(...color);
        doc.roundedRect(x, y - height + 2, width, height, 2, 2, 'F');
        if (text) {
          doc.setTextColor(...textColor);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', isBold ? 'bold' : 'normal');
          doc.text(text, x + 3, y - height / 2 + 3);
        }
        doc.setTextColor(0, 0, 0);
      };

      // Helper function to add text with word wrap
      const addWrappedText = (text, x, y, maxWidth, fontSize = 10, isBold = false, textColor = null) => {
        if (textColor) doc.setTextColor(...textColor);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(String(text || ''), maxWidth);
        doc.text(lines, x, y);
        doc.setTextColor(0, 0, 0);
        // Return height: number of lines * line height (fontSize * 0.35 is approximate line height)
        return lines.length * (fontSize * 0.35 + 1);
      };

      // Helper function to check if we need a new page
      const checkNewPage = (requiredSpace) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Header with colored background
      const headerHeight = 25;
      addColoredBox(margin - 2, yPos + headerHeight, pageWidth - 2 * margin + 4, headerHeight, colors.primary, '', 0);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      // Build title with division if selected
      let pdfTitle = 'Oman Airports Competency Dictionary';
      if (exportDivision) {
        pdfTitle += ` - ${exportDivision}`;
      }
      const titleLines = doc.splitTextToSize(pdfTitle, maxWidth - 10);
      doc.text(titleLines, margin + 5, yPos + 12);
      yPos += headerHeight + 5;

      // Export info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.secondary);
      const exportDateStr = new Date().toISOString().slice(0, 10);
      doc.text(`Generated on: ${exportDateStr}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Total Competencies: ${data.length}`, margin, yPos);
      yPos += lineHeight + sectionSpacing;
      doc.setTextColor(0, 0, 0);

      // Process each competency
      data.forEach((competency, idx) => {
        checkNewPage(50); // Reserve space for a competency section

        // Competency header with colored background
        const competencyTitle = `${idx + 1}. ${competency.name || 'Unnamed Competency'}`;
        const titleHeight = 12;
        addColoredBox(margin - 2, yPos + titleHeight, pageWidth - 2 * margin + 4, titleHeight, colors.secondary, '', 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        const titleLines = doc.splitTextToSize(competencyTitle, maxWidth - 10);
        doc.text(titleLines, margin + 3, yPos + 8);
        yPos += titleHeight + 5;
        doc.setTextColor(0, 0, 0);

        // Basic fields
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        fields.forEach(({ key, label }) => {
          if (key.startsWith('LEVEL_')) return; // Handle levels separately
          
          let value = '';
          if (key === 'related_division') {
            value = competency.related_division || competency.relatedDivision || 'N/A';
          } else if (key === 'createdAt' || key === 'updatedAt') {
            value = competency[key] ? new Date(competency[key]).toLocaleDateString() : 'N/A';
          } else if (key === 'isActive') {
            value = competency[key] ? 'Yes' : 'No';
          } else {
            value = competency[key] || 'N/A';
          }

          if (value && value !== 'N/A' && value !== '') {
            checkNewPage(15);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.secondary);
            doc.text(`${label}:`, margin + 5, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            const textWidth = doc.getTextWidth(`${label}: `);
            const valueHeight = addWrappedText(String(value), margin + textWidth + 5, yPos, maxWidth - textWidth - 5, 10, false);
            yPos += Math.max(lineHeight, valueHeight) + 2;
          }
        });

        // Levels section with colored headers
        const levelKeys = ['LEVEL_BASIC', 'LEVEL_INTERMEDIATE', 'LEVEL_ADVANCED', 'LEVEL_MASTERY'];
        const levelLabels = ['Aware Level (BASIC)', 'Knowledge Level (INTERMEDIATE)', 'Skilled Level (ADVANCED)', 'Mastery Level (MASTERY)'];
        const levelCodes = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
        const levelColors = [colors.aware, colors.knowledge, colors.skilled, colors.mastery];

        levelKeys.forEach((levelKey, levelIdx) => {
          if (!fields.find(f => f.key === levelKey)) return;
          
          const level = competency.levels?.find(l => l.level === levelCodes[levelIdx]);
          if (!level) return;

          checkNewPage(30);
          yPos += sectionSpacing + 2;
          
          // Level header with colored background
          const levelHeaderHeight = 10;
          const levelColor = levelColors[levelIdx];
          addColoredBox(margin - 2, yPos + levelHeaderHeight, pageWidth - 2 * margin + 4, levelHeaderHeight, levelColor, '', 0);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(levelLabels[levelIdx], margin + 3, yPos + 7);
          yPos += levelHeaderHeight + 5;
          doc.setTextColor(0, 0, 0);

          // Level description
          if (level.description) {
            checkNewPage(15);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...levelColor);
            doc.text('Description:', margin + 5, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += lineHeight;
            doc.setFont('helvetica', 'normal');
            // Add light background for description
            const descLines = doc.splitTextToSize(level.description, maxWidth - 15);
            const descHeight = descLines.length * (10 * 0.35 + 1);
            doc.setFillColor(...colors.lightBg);
            doc.roundedRect(margin + 5, yPos - 5, maxWidth - 10, descHeight + 3, 2, 2, 'F');
            doc.text(descLines, margin + 8, yPos);
            yPos += descHeight + 5;
          }

          // Level indicators
          if (Array.isArray(level.indicators) && level.indicators.length > 0) {
            checkNewPage(20);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...levelColor);
            doc.text('Level Indicators:', margin + 5, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += lineHeight;
            doc.setFont('helvetica', 'normal');
            level.indicators.forEach((ind, indIdx) => {
              const text = (ind || '').toString().trim();
              if (text) {
                checkNewPage(10);
                doc.setTextColor(...colors.secondary);
                doc.text(`${indIdx + 1})`, margin + 10, yPos);
                doc.setTextColor(0, 0, 0);
                const textWidth = doc.getTextWidth(`${indIdx + 1}) `);
                doc.text(text, margin + 10 + textWidth, yPos);
                yPos += lineHeight;
              }
            });
            yPos += 2;
          }

          // Elements with indicators
          if (Array.isArray(level.elements) && level.elements.length > 0) {
            checkNewPage(20);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...levelColor);
            doc.text('Elements:', margin + 5, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += lineHeight;
            doc.setFont('helvetica', 'normal');
            
            level.elements.forEach((el, elIdx) => {
              const elementName = (el?.name || '').toString().trim();
              if (!elementName) return;

              checkNewPage(15);
              // Element name (numbered) with color
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...levelColor);
              doc.text(`${elIdx + 1}.`, margin + 10, yPos);
              doc.setTextColor(0, 0, 0);
              const numWidth = doc.getTextWidth(`${elIdx + 1}. `);
              doc.text(elementName, margin + 10 + numWidth, yPos);
              yPos += lineHeight;

              // Element indicators (bulleted)
              if (Array.isArray(el.performanceIndicators) && el.performanceIndicators.length > 0) {
                el.performanceIndicators.forEach((pi) => {
                  const action = (pi?.action || '').toString().trim();
                  if (action) {
                    checkNewPage(8);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 100, 100);
                    doc.text('-', margin + 15, yPos);
                    doc.setTextColor(0, 0, 0);
                    const bulletWidth = doc.getTextWidth('- ');
                    doc.text(action, margin + 15 + bulletWidth, yPos);
                    yPos += lineHeight - 1;
                  }
                });
              }
              yPos += 2;
            });
          }
        });

        // Add separator line between competencies
        yPos += sectionSpacing;
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += sectionSpacing * 2;
      });

      // Save PDF with division in filename if selected
      let filename = `competencies_export_${exportDateStr}`;
      if (exportDivision) {
        // Sanitize division name for filename (remove special characters, replace spaces with underscores)
        const sanitizedDivision = exportDivision.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        filename += `_${sanitizedDivision}`;
      }
      doc.save(`${filename}.pdf`);
    } else {
      // CSV
      const header = fields.map(f => `"${f.label}"`).join(',');
      const rows = data.map(c => {
        return fields
          .map(({ key }) => {
            let value;
            if (key === 'related_division') {
              value = c.related_division || c.relatedDivision || '';
            } else if (key === 'createdAt' || key === 'updatedAt') {
              value = c[key] ? new Date(c[key]).toISOString() : '';
            } else if (key === 'LEVEL_BASIC') {
              value = buildLevelCell(c, 'BASIC');
            } else if (key === 'LEVEL_INTERMEDIATE') {
              value = buildLevelCell(c, 'INTERMEDIATE');
            } else if (key === 'LEVEL_ADVANCED') {
              value = buildLevelCell(c, 'ADVANCED');
            } else if (key === 'LEVEL_MASTERY') {
              value = buildLevelCell(c, 'MASTERY');
            } else {
              value = c[key] ?? '';
            }
            const safe = String(value).replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(',');
      });
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `competencies_export_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast({
      title: 'Export started',
      description: 'Your competencies export has been generated.',
      variant: 'default',
    });
    setShowExportModal(false);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC':
        return 'bg-gray-100 text-gray-800';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED':
        return 'bg-blue-100 text-blue-800';
      case 'MASTERY':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'SOP':
        return '📋';
      case 'MANUAL':
        return '📖';
      case 'GUIDELINE':
        return '📝';
      case 'PROCEDURE':
        return '⚙️';
      case 'TRAINING_MATERIAL':
        return '🎓';
      case 'POLICY':
        return '📜';
      default:
        return '📄';
    }
  };

const getTotalElementsCount = (competency) => {
  if (competency?.elementsCount !== undefined && competency?.elementsCount !== null) {
    return competency.elementsCount;
  }
  if (Array.isArray(competency?.levels)) {
    return competency.levels.reduce((sum, level) => sum + (level.elements?.length || 0), 0);
  }
  return 0;
};

  // Client-side filtering for instant search
  const filteredCompetencies = useMemo(() => {
    if (!competencies) return [];
    
    let filtered = competencies;
    
    // Search filter
    if (searchInput.trim()) {
      const searchLower = searchInput.toLowerCase();
      filtered = filtered.filter(competency => 
        competency.name?.toLowerCase().includes(searchLower) ||
        competency.definition?.toLowerCase().includes(searchLower) ||
        competency.family?.toLowerCase().includes(searchLower) ||
        competency.type?.toLowerCase().includes(searchLower)
      );
    }
    
    // Type filter
    if (selectedType) {
      filtered = filtered.filter(competency => competency.type === selectedType);
    }
    
    // Family filter
    if (selectedFamily) {
      filtered = filtered.filter(competency => competency.family === selectedFamily);
    }
    
    // Division filter
    if (selectedDivision) {
      filtered = filtered.filter(competency => 
        competency.related_division === selectedDivision || 
        competency.relatedDivision === selectedDivision
      );
    }
    
    return filtered;
  }, [competencies, searchInput, selectedType, selectedFamily, selectedDivision]);
  
  const filteredCount = filteredCompetencies.length;
  const activeLevelForModalHeader = activeLevelId
    ? levelElements?.find(level => level.id === activeLevelId)
    : null;

  const toggleCompetency = (competencyId) => {
    setExpandedCompetency(expandedCompetency === competencyId ? null : competencyId);
  };

  const fetchAssessors = async (competencyId) => {
    try {
      setAssessorsLoading(true);
      const response = await api.get(`/assessors/competency/${competencyId}`);
      const assessors = response.data.assessors || [];
      setAssessors(assessors);
      
      // Store assessors count for this competency
      setCompetencyAssessors(prev => ({
        ...prev,
        [competencyId]: assessors
      }));
    } catch (error) {
      console.error('Error fetching assessors:', error);
      toast({
        title: "Error",
        description: "Failed to load assessors for this competency.",
        variant: "destructive",
      });
      setAssessors([]);
    } finally {
      setAssessorsLoading(false);
    }
  };

  const openAssessorModal = (competency) => {
    setSelectedCompetency(competency);
    setShowAssessorModal(true);
    fetchAssessors(competency.id);
  };

  const loadCompetencyLevelElements = async (competencyId) => {
    setElementsLoading(true);
    try {
      const response = await api.get(`/competencies/${competencyId}`);
      const levels = (response.data?.levels || []).map(level => ({
        ...level,
        elements: Array.isArray(level.elements) ? level.elements : []
      }));
      setLevelElements(levels);
    } catch (error) {
      console.error('Error fetching level elements:', error);
      toast({
        title: "Error",
        description: "Failed to load competency elements.",
        variant: "destructive",
      });
      setLevelElements([]);
    } finally {
      setElementsLoading(false);
    }
  };

  const openCompetencyViewModal = async (competency) => {
    try {
      setViewCompetencyLoading(true);
      setShowCompetencyViewModal(true);
      setFullCompetencyView(null);

      // Fetch full competency details (including levels, elements, performance indicators)
      const response = await api.get(`/competencies/${competency.id}`);
      setFullCompetencyView(response.data);
    } catch (error) {
      console.error('Error fetching full competency:', error);
      toast({
        title: 'Error',
        description: 'Failed to load full competency details.',
        variant: 'destructive',
      });
      setShowCompetencyViewModal(false);
    } finally {
      setViewCompetencyLoading(false);
    }
  };

  const openElementsModal = async (competency, levelId = null) => {
    setSelectedCompetencyForElements(competency);
    setActiveLevelId(levelId);
    setExpandedElementsModal({});
    setShowElementsModal(true);

    const hasLevels = Array.isArray(competency.levels) && competency.levels.length > 0;
    if (hasLevels) {
      setLevelElements(
        competency.levels.map(level => ({
          ...level,
          elements: Array.isArray(level.elements) ? level.elements : []
        }))
      );
    } else {
      await loadCompetencyLevelElements(competency.id);
    }
  };

  // Check if competency has assessors (we'll need to track this)
  const [competencyAssessors, setCompetencyAssessors] = useState({});
  
  // Function to check if a competency has assessors
  const hasAssessors = (competencyId) => {
    return competencyAssessors[competencyId] && competencyAssessors[competencyId].length > 0;
  };

  // Pre-fetch assessors for all competencies to show correct icon colors
  useEffect(() => {
    if (competencies.length > 0) {
      const fetchAllAssessors = async () => {
        const promises = competencies.map(async (competency) => {
          try {
            const response = await api.get(`/assessors/competency/${competency.id}`);
            return {
              competencyId: competency.id,
              assessors: response.data.assessors || []
            };
          } catch (error) {
            console.error(`Error fetching assessors for competency ${competency.id}:`, error);
            return {
              competencyId: competency.id,
              assessors: []
            };
          }
        });

        const results = await Promise.all(promises);
        const assessorsMap = {};
        results.forEach(result => {
          assessorsMap[result.competencyId] = result.assessors;
        });
        setCompetencyAssessors(assessorsMap);
      };

      fetchAllAssessors();
    }
  }, [competencies]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading competencies...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p>Error loading competencies: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-red-600 break-words">
            Competency Framework
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Manage your organization's competency dictionary and skill development
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="loyverse-button-secondary whitespace-nowrap text-xs sm:text-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Dictionary
          </Button>
          <Button
            onClick={() => navigate('/competency-families')}
            className="loyverse-button-secondary whitespace-nowrap text-xs sm:text-sm"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Add Family
          </Button>
          <Button
            onClick={() => {
              // initialise export filters from current filters
              setExportType(selectedType || '');
              setExportFamily(selectedFamily || '');
              setExportDivision(selectedDivision || '');
              setExportFieldMode('all');
              setSelectedExportFields(EXPORT_FIELDS.map(f => f.key));
              setExportFormat('csv');
              setShowExportModal(true);
            }}
            className="loyverse-button-secondary whitespace-nowrap text-xs sm:text-sm"
            title="Export competencies"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => navigate('/competencies/add')}
            className="loyverse-button whitespace-nowrap text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Competency
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Competencies</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Families</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.families?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Related Divisions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.divisions?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="search">Search Competencies</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  id="search"
                  key="search-input"
                  placeholder="Search by name, definition, or family..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type">Competency Type</Label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="loyverse-input mt-1"
              >
                <option value="">All Types</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="family">Competency Family</Label>
              <select
                id="family"
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="loyverse-input mt-1"
              >
                <option value="">All Families</option>
                {availableFamilies.map(family => (
                  <option key={family} value={family}>{family}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="division">Related Division</Label>
              <select
                id="division"
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="loyverse-input mt-1"
              >
                <option value="">All Divisions</option>
                {availableDivisions.map(division => (
                  <option key={division} value={division}>{division}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>
          Showing <span className="font-semibold text-gray-900">{filteredCount}</span> {filteredCount === 1 ? 'competency' : 'competencies'}
        </span>
      </div>

      {/* Competencies List */}
      <div className="space-y-4">
        {filteredCompetencies.map((competency) => {
          const totalElements = getTotalElementsCount(competency);
          return (
            <Card
              key={competency.id}
              className="hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start space-x-3 sm:space-x-4 min-w-0">
                  <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                        {competency.name}
                      </h3>
                      <span
                        className={`inline-flex px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-full ${getTypeColor(
                          competency.type
                        )}`}
                      >
                        {competency.type.replace('_', ' ')}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-full ${getFamilyColor(
                          competency.family
                        )}`}
                      >
                        {competency.family}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 break-words">
                      {competency.definition}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {competency.relatedDivision && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                          Division: {competency.relatedDivision}
                        </span>
                      )}
                      {Array.isArray(competency.relatedDocuments) &&
                        competency.relatedDocuments.length > 0 && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                            Related Docs: {competency.relatedDocuments.length}
                          </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-blue-600"
                        onClick={() =>
                          setExpandedCompetency(
                            expandedCompetency === competency.id ? null : competency.id
                          )
                        }
                      >
                        <Target className="h-3 w-3 mr-1" />
                        {competency.levels.length} Levels
                      </button>
                      <span className="flex items-center">
                        <Document className="h-3 w-3 mr-1" />
                        {competency.documents.length} Documents
                      </span>
                      <button
                        type="button"
                        className="flex items-center cursor-pointer hover:text-orange-600"
                        onClick={() => openElementsModal(competency)}
                        title="View Elements"
                      >
                        <List className="h-3 w-3 mr-1" />
                        {totalElements} Elements
                      </button>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {competency.assessmentCount} Assessments
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 flex-shrink-0">
                  <button 
                    onClick={() => openAssessorModal(competency)}
                    className={`${hasAssessors(competency.id) ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-green-600'}`}
                    title={`View Assessors${hasAssessors(competency.id) ? ` (${competencyAssessors[competency.id]?.length || 0} assigned)` : ' (None assigned)'}`}
                  >
                    <UserCheck className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => openCompetencyViewModal(competency)}
                    className="text-gray-400 hover:text-blue-600" 
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => navigate(`/competencies/edit/${competency.id}`, { 
                      state: { 
                        from: 'competencies',
                        filters: {
                          searchInput,
                          selectedType,
                          selectedFamily,
                          selectedDivision,
                        }
                      } 
                    })}
                    className="text-gray-400 hover:text-blue-600" 
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => toggleCompetency(competency.id)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Expand"
                  >
                    {expandedCompetency === competency.id ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>
            </CardHeader>
            
            {expandedCompetency === competency.id && (
              <CardContent className="pt-0">
                <div className="space-y-6">
                  {/* Competency Levels */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Competency Levels</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {competency.levels.map((level) => {
                        const levelElements = level.elements || [];
                        
                        return (
                          <div key={level.id} className="border border-gray-200 rounded-lg p-4 flex flex-col h-full">
                            <div className="flex items-center justify-center mb-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(level.level)}`}>
                                {getLevelDisplayName(level.level)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{level.description}</p>
                            {level.indicators.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Indicators:</p>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {level.indicators.slice(0, 2).map((indicator, index) => (
                                    <li key={index} className="flex items-start">
                                      <span className="mr-1">•</span>
                                      <span>{indicator}</span>
                                    </li>
                                  ))}
                                  {level.indicators.length > 2 && (
                                    <li className="text-gray-400">+{level.indicators.length - 2} more...</li>
                                  )}
                                </ul>
                              </div>
                            )}

                            <div className="mt-auto pt-3 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => openElementsModal(competency, level.id)}
                                className="flex items-center justify-between w-full text-xs font-medium text-gray-700 hover:text-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={levelElements.length === 0}
                              >
                                <span className="flex items-center gap-1">
                                  <List className="h-3 w-3" />
                                  View Elements
                                </span>
                                <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  {levelElements.length}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Documents */}
                  {(competency.documents.length > 0 || (Array.isArray(competency.relatedDocuments) && competency.relatedDocuments.length > 0)) && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Related Documents</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {competency.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-lg">{getDocumentIcon(doc.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                              <p className="text-xs text-gray-500">{doc.type} • v{doc.version}</p>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {Array.isArray(competency.relatedDocuments) && competency.relatedDocuments.map((url, idx) => (
                          <a key={`rel-${idx}`} href={url} target="_blank" rel="noreferrer" className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <span className="text-lg">📄</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{url}</p>
                              <p className="text-xs text-gray-500">Related Link</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )})}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Competency Dictionary</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select CSV file</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSV should include: Competency Name, Type, Family, Definition, and level descriptions.
                </p>
              </div>
              {uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowUploadModal(false)}
                  className="loyverse-button-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={isUploading || !file}
                  className="loyverse-button"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessor Modal */}
      {showAssessorModal && selectedCompetency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Assessors for {selectedCompetency.name}</h3>
                  <p className="text-sm text-gray-600">{selectedCompetency.type} • {selectedCompetency.family}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssessorModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {assessorsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading assessors...</p>
                  </div>
                </div>
              ) : assessors.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessors Found</h3>
                  <p className="text-gray-500">
                    No assessors have been assigned to this competency yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-6">
                    <p className="text-sm text-gray-600">
                      {assessors.length} assessor{assessors.length !== 1 ? 's' : ''} assigned to this competency
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assessors.map((assessor) => (
                      <div key={assessor.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <EmployeePhoto
                              sid={assessor.assessor_sid}
                              firstName={assessor.first_name}
                              lastName={assessor.last_name}
                              size="medium"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {assessor.first_name} {assessor.last_name}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">
                              {assessor.job_title || 'No Job Title'}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {assessor.assessor_sid}
                            </p>
                            
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Level:</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(assessor.competency_level)}`}>
                                  {assessor.competency_level}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Status:</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  assessor.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {assessor.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              
                              <div className="text-xs text-gray-500">
                                <div className="flex items-center">
                                  <span className="truncate">{assessor.email}</span>
                                </div>
                                <div className="flex items-center mt-1">
                                  <span>{assessor.division || 'No Division'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Elements Modal */}
      {showElementsModal && selectedCompetencyForElements && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-50 to-yellow-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <List className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Elements for {selectedCompetencyForElements.name}</h3>
                  <p className="text-sm text-gray-600">
                    {activeLevelForModalHeader
                      ? `${getLevelDisplayName(activeLevelForModalHeader.level)} Level • ${selectedCompetencyForElements.type} • ${selectedCompetencyForElements.family}`
                      : `${selectedCompetencyForElements.type} • ${selectedCompetencyForElements.family}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowElementsModal(false);
                  setActiveLevelId(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {elementsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading elements...</p>
                  </div>
                </div>
              ) : (() => {
                const normalizedLevels = Array.isArray(levelElements) ? levelElements : [];
                const activeLevel = activeLevelId ? normalizedLevels.find(level => level.id === activeLevelId) : null;
                const displayLevels = activeLevel ? normalizedLevels.filter(level => level.id === activeLevelId) : normalizedLevels;
                const totalLevelElements = displayLevels.reduce((sum, level) => sum + (level.elements?.length || 0), 0);

                if (displayLevels.length === 0 || totalLevelElements === 0) {
                  return (
                    <div className="text-center py-12">
                      <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-medium mb-2">No Elements Found</p>
                      <p className="text-gray-500 text-sm">This competency doesn't have any elements yet.</p>
                      <Button
                        onClick={() => {
                          setShowElementsModal(false);
                          setActiveLevelId(null);
                          navigate(`/competencies/edit/${selectedCompetencyForElements.id}`);
                        }}
                        className="mt-4 loyverse-button"
                      >
                        Add Elements
                      </Button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <p className="text-sm text-gray-600">
                        {activeLevel
                          ? `Showing ${totalLevelElements} element${totalLevelElements !== 1 ? 's' : ''} in ${getLevelDisplayName(activeLevel.level)} level.`
                          : `Showing ${totalLevelElements} element${totalLevelElements !== 1 ? 's' : ''} across ${displayLevels.length} level${displayLevels.length !== 1 ? 's' : ''}.`}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowElementsModal(false);
                          setActiveLevelId(null);
                          navigate(`/competencies/edit/${selectedCompetencyForElements.id}`);
                        }}
                      >
                        Manage Elements
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {displayLevels.map((level) => (
                        <div key={level.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(level.level)}`}>
                                {getLevelDisplayName(level.level)}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{level.title}</span>
                            </div>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              {level.elements?.length || 0} element{(level.elements?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {level.elements?.length ? (
                            <ul className="space-y-2">
                              {level.elements.map((element) => {
                                const isExpanded = expandedElementsModal[element.id];
                                const indicators = element.performanceIndicators || [];
                                return (
                                  <li key={element.id} className="border border-gray-100 rounded-md p-2 bg-gray-50">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedElementsModal(prev => ({
                                              ...prev,
                                              [element.id]: !prev[element.id]
                                            }))
                                          }
                                          className="flex items-center gap-2 mb-1 text-left w-full"
                                        >
                                          <span className="text-gray-400">
                                            {isExpanded ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                          </span>
                                          <span className="font-medium text-gray-900 text-sm">
                                            {element.name}
                                          </span>
                                        </button>
                                      </div>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                          element.isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}
                                      >
                                        {element.isActive ? 'Active' : 'Inactive'}
                                      </span>
                                    </div>

                                    {isExpanded && (
                                      <div className="mt-2 pt-2 border-t border-gray-200 ml-5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[11px] font-medium text-gray-700">
                                            Performance Indicators
                                          </span>
                                          <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                            {indicators.length}
                                          </span>
                                        </div>
                                        {indicators.length > 0 ? (
                                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-700">
                                            {indicators.map((pi) => (
                                              <li key={pi.id || pi.action}>{pi.action || pi}</li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-[11px] text-gray-400 italic">
                                            No performance indicators defined for this element.
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-500 italic">No elements defined for this level yet.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Export Competencies Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Export Competencies</h3>
                  <p className="text-xs text-gray-500">
                    Choose format, filters, and fields to include in the exported file.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Format */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Format</h4>
                <div className="flex items-center space-x-4 text-sm">
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <span>CSV (Excel compatible)</span>
                  </label>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <span>JSON</span>
                  </label>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <span>PDF</span>
                  </label>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="html"
                      checked={exportFormat === 'html'}
                      onChange={(e) => setExportFormat(e.target.value)}
                    />
                    <span>HTML Editor (with CSV download)</span>
                  </label>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Filters</h4>
                <p className="text-xs text-gray-500 mb-2">
                  Leave filters empty to export the entire competency dictionary.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <Label htmlFor="export-type">Type</Label>
                    <select
                      id="export-type"
                      value={exportType}
                      onChange={(e) => setExportType(e.target.value)}
                      className="loyverse-input mt-1"
                    >
                      <option value="">All Types</option>
                      {availableTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="export-family">Family</Label>
                    <select
                      id="export-family"
                      value={exportFamily}
                      onChange={(e) => setExportFamily(e.target.value)}
                      className="loyverse-input mt-1"
                    >
                      <option value="">All Families</option>
                      {availableFamilies.map((family) => (
                        <option key={family} value={family}>
                          {family}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="export-division">Related Division</Label>
                    <select
                      id="export-division"
                      value={exportDivision}
                      onChange={(e) => setExportDivision(e.target.value)}
                      className="loyverse-input mt-1"
                    >
                      <option value="">All Divisions</option>
                      {availableDivisions.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Fields</h4>
                <div className="flex items-center space-x-4 text-sm">
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      name="exportFieldMode"
                      value="all"
                      checked={exportFieldMode === 'all'}
                      onChange={(e) => setExportFieldMode(e.target.value)}
                    />
                    <span>All fields</span>
                  </label>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      name="exportFieldMode"
                      value="selected"
                      checked={exportFieldMode === 'selected'}
                      onChange={(e) => setExportFieldMode(e.target.value)}
                    />
                    <span>Selected fields only</span>
                  </label>
                </div>
                {exportFieldMode === 'selected' && (
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">
                        Choose which columns you want in the export.
                      </span>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={() =>
                          setSelectedExportFields((prev) =>
                            prev.length === EXPORT_FIELDS.length
                              ? []
                              : EXPORT_FIELDS.map((f) => f.key)
                          )
                        }
                      >
                        {selectedExportFields.length === EXPORT_FIELDS.length
                          ? 'Clear all'
                          : 'Select all'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {EXPORT_FIELDS.map((field) => (
                        <label
                          key={field.key}
                          className="inline-flex items-center space-x-2 text-xs text-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={selectedExportFields.includes(field.key)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedExportFields((prev) => {
                                if (checked) {
                                  return [...prev, field.key];
                                }
                                return prev.filter((k) => k !== field.key);
                              });
                            }}
                          />
                          <span>{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Competency View Modal */}
      {showCompetencyViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {fullCompetencyView?.name || 'Competency Details'}
                  </h3>
                  {fullCompetencyView && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {fullCompetencyView.code && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-mono">
                          {fullCompetencyView.code}
                        </span>
                      )}
                      {fullCompetencyView.type && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                          {fullCompetencyView.type}
                        </span>
                      )}
                      {fullCompetencyView.family && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                          {fullCompetencyView.family}
                        </span>
                      )}
                      {fullCompetencyView.relatedDivision && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                          {fullCompetencyView.relatedDivision}
                        </span>
                      )}
                      {fullCompetencyView && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                            fullCompetencyView.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {fullCompetencyView.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCompetencyViewModal(false);
                  setFullCompetencyView(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {viewCompetencyLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading competency details...</p>
                  </div>
                </div>
              )}

              {!viewCompetencyLoading && fullCompetencyView && (
                <>
                  {/* Definition */}
                  {fullCompetencyView.definition && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Definition
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {fullCompetencyView.definition}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Levels, Indicators & Elements */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4 text-green-600" />
                        Levels, Indicators & Elements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(() => {
                          const levelOrder = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
                          const levelsForView = Array.isArray(fullCompetencyView.levels)
                            ? [...fullCompetencyView.levels].sort(
                                (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
                              )
                            : [];

                          return levelsForView.map((level) => {
                            const elements = level.elements || [];
                            return (
                              <div
                                key={level.id}
                                className="border border-gray-200 rounded-lg p-4 bg-white"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(
                                      level.level
                                    )}`}
                                  >
                                    {getLevelDisplayName(level.level)}
                                  </span>
                                  <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                    {elements.length} element
                                    {elements.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {level.description && (
                                  <p className="text-xs text-gray-700 mb-2 whitespace-pre-wrap">
                                    {level.description}
                                  </p>
                                )}
                                {Array.isArray(level.indicators) &&
                                  level.indicators.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-[11px] font-semibold text-gray-700 mb-1">
                                        Level Indicators
                                      </p>
                                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-700">
                                        {level.indicators.map((ind, idx) => (
                                          <li key={idx}>{ind}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                {elements.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <p className="text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                      <Users className="h-3 w-3 text-green-600" />
                                      Elements & Performance Indicators
                                    </p>
                                    <ul className="space-y-1">
                                      {elements.map((el) => (
                                        <li
                                          key={el.id}
                                          className="bg-gray-50 border border-gray-100 rounded-md p-2"
                                        >
                                          <p className="text-xs font-medium text-gray-900 mb-1">
                                            {el.name}
                                          </p>
                                          {Array.isArray(el.performanceIndicators) &&
                                            el.performanceIndicators.length > 0 && (
                                              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-700">
                                                {el.performanceIndicators.map((pi) => (
                                                  <li key={pi.id || pi.action}>
                                                    {pi.action || pi}
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Competencies;
