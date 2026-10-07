import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Zap,
  Database,
  Image,
  Users,
  Lock,
  BarChart3,
  Download,
} from 'lucide-react';

const TasksRecommendationsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [expandedTask, setExpandedTask] = useState(null);

  if (!isOpen) return null;

  // Recommended tasks with implementation details
  const tasks = [
    {
      id: 1,
      title: 'Image Optimization Pipeline',
      description: 'Automatic image resizing, compression, and lazy loading',
      priority: 'high',
      status: 'in-progress',
      effort: '2-3 days',
      impact: 'High (performance)',
      features: [
        'Automatic image resizing & compression',
        'CDN optimization with responsive images',
        'Lazy loading implementation',
        'Logo optimization based on position'
      ],
      benefits: [
        'Reduce page load by 50-70%',
        'Save 60-75% bandwidth',
        'Improved SEO ranking',
        'Better mobile performance'
      ],
      relatedFiles: [
        'server/services/imageOptimization.js',
        'client/components/LazyImage.jsx'
      ]
    },
    {
      id: 2,
      title: 'Two-Factor Authentication (2FA)',
      description: 'SMS/Email OTP and authenticator app support',
      priority: 'critical',
      status: 'pending',
      effort: '2-3 days',
      impact: 'Critical (security)',
      features: [
        'SMS OTP verification',
        'Email OTP backup',
        'Authenticator app (TOTP)',
        'Recovery codes'
      ],
      benefits: [
        'Prevent unauthorized access',
        'Comply with security standards',
        'User account protection',
        'Admin security hardening'
      ],
      relatedFiles: [
        'server/middleware/verifyToken.js',
        'server/controllers/auth.controller.js'
      ]
    },
    {
      id: 3,
      title: 'Admin Analytics Dashboard',
      description: 'Real-time system metrics and performance analytics',
      priority: 'high',
      status: 'pending',
      effort: '3-5 days',
      impact: 'High (business value)',
      features: [
        'Real-time system metrics',
        'Property performance charts',
        'User engagement analytics',
        'Scraper health monitoring',
        'Revenue tracking'
      ],
      benefits: [
        'Data-driven decisions',
        'Early problem detection',
        'Performance tracking',
        'Business insights'
      ],
      relatedFiles: [
        'client/screens/Admin Page/admin.dashboardoverview.jsx'
      ]
    },
    {
      id: 4,
      title: 'Bulk Property Actions',
      description: 'Mass activate/deactivate and batch edit properties',
      priority: 'medium',
      status: 'pending',
      effort: '2-3 days',
      impact: 'Medium (productivity)',
      features: [
        'Bulk activate/deactivate',
        'Batch property editing',
        'Bulk tagging system',
        'CSV export'
      ],
      benefits: [
        'Save admin time',
        'Reduce manual errors',
        'Faster property management',
        'Better workflow'
      ],
      relatedFiles: [
        'client/screens/Admin Page/admin.propertyManager.jsx'
      ]
    },
    {
      id: 5,
      title: 'Property Export (CSV/PDF)',
      description: 'Download listings as CSV or PDF with custom filters',
      priority: 'medium',
      status: 'pending',
      effort: '2-3 days',
      impact: 'Medium (admin tools)',
      features: [
        'CSV export with all fields',
        'PDF report generation',
        'Filter-based exports',
        'Custom field selection'
      ],
      benefits: [
        'Easy data sharing',
        'Custom reporting',
        'Offline access',
        'Data analysis'
      ],
      relatedFiles: [
        'server/controllers/export.controller.js'
      ]
    }
  ];

  // Recommended upgrades with implementation details
  const recommendations = [
    {
      id: 1,
      title: 'Property Recommendations Engine',
      description: 'ML-based suggestions for users with personalization',
      effort: '5-7 days',
      impact: 'High (engagement)',
      deployment: 'Separate Render (512MB)',
      status: 'in-progress',
      folder: 'recommendations-engine/',
      features: [
        'Personalized user recommendations',
        'Similar properties finder',
        'Trending properties',
        'User engagement tracking'
      ],
      integration: [
        'Call from main app API',
        'Graceful degradation if unavailable',
        'Caching for performance'
      ],
      endpoints: [
        'GET /api/recommendations/user/:userId',
        'GET /api/recommendations/similar/:propertyId',
        'GET /api/recommendations/trending'
      ]
    },
    {
      id: 2,
      title: 'Saved Searches with Alerts',
      description: 'User-saved filters with email/SMS notifications',
      effort: '4-5 days',
      impact: 'Medium (engagement)',
      deployment: 'Main server',
      status: 'pending',
      features: [
        'Save search filters',
        'Email alerts for new matches',
        'SMS notifications (optional)',
        'Alert frequency control'
      ]
    },
    {
      id: 3,
      title: 'SMS/Email Preferences',
      description: 'User preference center for notifications',
      effort: '2-3 days',
      impact: 'Medium (UX)',
      deployment: 'Main server',
      status: 'pending',
      features: [
        'Opt-in/opt-out controls',
        'Frequency settings',
        'Channel preferences',
        'Notification history'
      ]
    },
    {
      id: 4,
      title: 'Elasticsearch Integration',
      description: 'Advanced search at scale (10-100x faster)',
      effort: '3-5 days',
      impact: 'High (search)',
      deployment: 'Separate service',
      status: 'pending',
      features: [
        'Full-text search enhancement',
        'Advanced aggregations',
        'Real-time indexing',
        'Search analytics'
      ]
    },
    {
      id: 5,
      title: 'Price Prediction Model',
      description: 'ML model for property value estimation',
      effort: '1-2 weeks',
      impact: 'High (value)',
      deployment: 'Separate microservice',
      status: 'pending',
      features: [
        'Property value estimation',
        'Market trend analysis',
        'Price range suggestions'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1000 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Tasks & Recommendations
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6 gap-8">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-4 font-semibold border-b-2 transition ${
              activeTab === 'tasks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              Priority Tasks
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`py-4 font-semibold border-b-2 transition ${
              activeTab === 'recommendations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} />
              Recommendations
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            task.priority === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : task.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            task.status === 'in-progress'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {task.status === 'in-progress' ? '🚀 In Progress' : '⏳ Pending'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{task.description}</p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600">
                          ⏱️ <strong>{task.effort}</strong>
                        </span>
                        <span className="text-gray-600">
                          📊 <strong>{task.impact}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandedTask === task.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <h4 className="font-semibold mb-2">Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {task.features.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Benefits:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {task.benefits.map((b, i) => <li key={i}>{b}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Related Files:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {task.relatedFiles.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => setExpandedTask(expandedTask === rec.id ? null : rec.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{rec.title}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            rec.status === 'in-progress'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rec.status === 'in-progress' ? '🚀 Building' : '📋 Recommended'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{rec.description}</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-gray-600">⏱️ {rec.effort}</span>
                        <span className="text-gray-600">📊 {rec.impact}</span>
                        <span className="text-gray-600">🚀 {rec.deployment}</span>
                        {rec.folder && (
                          <span className="text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                            {rec.folder}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedTask === rec.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <h4 className="font-semibold mb-2">Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {rec.features.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                      {rec.integration && (
                        <div>
                          <h4 className="font-semibold mb-2">Integration:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                            {rec.integration.map((i, idx) => <li key={idx}>{i}</li>)}
                          </ul>
                        </div>
                      )}
                      {rec.endpoints && (
                        <div>
                          <h4 className="font-semibold mb-2">API Endpoints:</h4>
                          <ul className="space-y-1 text-sm font-mono bg-gray-100 p-2 rounded">
                            {rec.endpoints.map((ep, i) => <li key={i}>{ep}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            💡 Click any task to see more details
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TasksRecommendationsModal;
