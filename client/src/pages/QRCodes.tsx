/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import React, { useState } from 'react';
import { 
  QrCode, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Copy,
  MoreVertical,
  Users,
  BarChart3,
  Calendar,
  Share2,
  Smartphone,
  Globe,
  TrendingUp
} from 'lucide-react';

const QRCodes = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedQRCodes, setSelectedQRCodes] = useState<number[]>([]);

  const qrCodes = [
    {
      id: 1,
      name: 'Restaurant Menu',
      type: 'menu',
      scans: 1247,
      conversions: 89,
      conversionRate: 7.1,
      created: '2024-01-15',
      lastScan: '2 hours ago',
      status: 'active',
      url: 'https://wa.me/1234567890?text=I%20want%20to%20see%20the%20menu'
    },
    {
      id: 2,
      name: 'Customer Support',
      type: 'support',
      scans: 892,
      conversions: 234,
      conversionRate: 26.2,
      created: '2024-01-12',
      lastScan: '15 minutes ago',
      status: 'active',
      url: 'https://wa.me/1234567890?text=I%20need%20help'
    },
    {
      id: 3,
      name: 'Product Catalog',
      type: 'catalog',
      scans: 634,
      conversions: 45,
      conversionRate: 7.1,
      created: '2024-01-10',
      lastScan: '1 hour ago',
      status: 'active',
      url: 'https://wa.me/1234567890?text=Show%20me%20products'
    },
    {
      id: 4,
      name: 'Event Registration',
      type: 'event',
      scans: 423,
      conversions: 67,
      conversionRate: 15.8,
      created: '2024-01-08',
      lastScan: '3 hours ago',
      status: 'paused',
      url: 'https://wa.me/1234567890?text=Register%20for%20event'
    },
    {
      id: 5,
      name: 'Newsletter Signup',
      type: 'newsletter',
      scans: 789,
      conversions: 156,
      conversionRate: 19.8,
      created: '2024-01-05',
      lastScan: '30 minutes ago',
      status: 'active',
      url: 'https://wa.me/1234567890?text=Subscribe%20to%20newsletter'
    }
  ];

  const filteredQRCodes = qrCodes.filter(qr => {
    const matchesSearch = qr.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || qr.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'menu': return 'bg-blue-100 text-blue-800';
      case 'support': return 'bg-purple-100 text-purple-800';
      case 'catalog': return 'bg-orange-100 text-orange-800';
      case 'event': return 'bg-pink-100 text-pink-800';
      case 'newsletter': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectQRCode = (id: number) => {
    setSelectedQRCodes(prev => 
      prev.includes(id) 
        ? prev.filter(qrId => qrId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedQRCodes.length === filteredQRCodes.length) {
      setSelectedQRCodes([]);
    } else {
      setSelectedQRCodes(filteredQRCodes.map(qr => qr.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
                <p className="text-gray-600">Generate and manage WhatsApp QR codes</p>
              </div>
            </div>
            <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Create QR Code
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total QR Codes', value: qrCodes.length.toString(), icon: QrCode, color: 'blue' },
            { title: 'Total Scans', value: qrCodes.reduce((sum, qr) => sum + qr.scans, 0).toLocaleString(), icon: Smartphone, color: 'green' },
            { title: 'Conversions', value: qrCodes.reduce((sum, qr) => sum + qr.conversions, 0).toString(), icon: TrendingUp, color: 'purple' },
            { title: 'Avg Conversion Rate', value: `${(qrCodes.reduce((sum, qr) => sum + qr.conversionRate, 0) / qrCodes.length).toFixed(1)}%`, icon: BarChart3, color: 'orange' }
          ].map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search QR codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="menu">Menu</option>
              <option value="support">Support</option>
              <option value="catalog">Catalog</option>
              <option value="event">Event</option>
              <option value="newsletter">Newsletter</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedQRCodes.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedQRCodes.length} QR code{selectedQRCodes.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-3">
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Download Selected
                </button>
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Pause Selected
                </button>
                <button className="text-red-600 hover:text-red-700 font-medium">
                  Delete Selected
                </button>
                <button 
                  onClick={() => setSelectedQRCodes([])}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Codes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredQRCodes.map((qrCode) => (
            <div key={qrCode.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <input
                    type="checkbox"
                    checked={selectedQRCodes.includes(qrCode.id)}
                    onChange={() => handleSelectQRCode(qrCode.id)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                  />
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(qrCode.status)}`}>
                      {qrCode.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(qrCode.type)}`}>
                      {qrCode.type}
                    </span>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <QrCode className="w-16 h-16 text-gray-600 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{qrCode.name}</h3>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Scans</span>
                    <span className="font-semibold text-gray-900">{qrCode.scans.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Conversions</span>
                    <span className="font-semibold text-gray-900">{qrCode.conversions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Conversion Rate</span>
                    <span className="font-semibold text-green-600">{qrCode.conversionRate}%</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  <div>Created: {qrCode.created}</div>
                  <div>Last scan: {qrCode.lastScan}</div>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </button>
                  <button className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center text-sm">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                  <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredQRCodes.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No QR codes found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first WhatsApp QR code'
              }
            </p>
            <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center mx-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodes;