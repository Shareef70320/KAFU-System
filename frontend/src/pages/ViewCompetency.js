import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';
import { getLevelDisplayName } from '../utils/competencyLevels';
import {
  ArrowLeft,
  BookOpen,
  Award,
  Target,
  Users,
  FileText,
  AlertCircle,
} from 'lucide-react';

const ViewCompetency = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: competency,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['competency-full', id],
    queryFn: async () => {
      const response = await api.get(`/competencies/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading competency...</p>
        </div>
      </div>
    );
  }

  if (isError || !competency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load competency
          </h2>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Please try again later.'}
          </p>
          <Button onClick={() => navigate('/competencies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competency Framework
          </Button>
        </div>
      </div>
    );
  }

  const levelOrder = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
  const sortedLevels = [...(competency.levels || [])].sort(
    (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <Button
              variant="outline"
              onClick={() => navigate('/competencies')}
              className="mb-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competency Framework
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              {competency.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {competency.code && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 font-mono text-xs">
                  {competency.code}
                </span>
              )}
              {competency.type && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                  {competency.type}
                </span>
              )}
              {competency.family && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                  {competency.family}
                </span>
              )}
              {competency.relatedDivision && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                  {competency.relatedDivision}
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  competency.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {competency.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Definition */}
        {competency.definition && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-blue-600" />
                Definition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {competency.definition}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Levels & Elements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-green-600" />
              Levels, Indicators & Elements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedLevels.map((level) => {
                const elements = level.elements || [];
                return (
                  <div
                    key={level.id}
                    className="border border-gray-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          level.level === 'BASIC'
                            ? 'bg-blue-100 text-blue-800'
                            : level.level === 'INTERMEDIATE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : level.level === 'ADVANCED'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {getLevelDisplayName(level.level)}
                      </span>
                      <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {elements.length} element{elements.length !== 1 ? 's' : ''}
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
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewCompetency;