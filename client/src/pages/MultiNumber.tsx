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
  Smartphone, 
  Plus, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  RefreshCw,
  Edit,
  Trash2,
  Copy,
  Activity,
  Users,
  MessageSquare,
  BarChart3,
  Search,
  Filter,
  Download,
  Upload,
  Phone,
  Globe,
  Shield
} from 'lucide-react';

const MultiNumber = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // Mock data for multiple WhatsApp numbers
  const numbers = [
    {
      id: 1,
      phoneNumber: '+1 (555) 123-4567',
      displayName: 'Main Support',
      status: 'active',
      health: 'healthy',
      businessName: 'TechCorp Solutions',
      country: 'United States',
      messagesCount: 1247,
      contactsCount: 892,
      lastActivity: '2 minutes ago',
      createdAt: '2024-01-15',
      qualityRating: 'High',
      rateLimit: '1,000/hour',
      messagesUsed: '247/1,000'
    },
    {
      id: 2,
      phoneNumber: '+44 20 7946 0958',
      displayName: 'UK Sales',
      status: 'active',
      health: 'warning',
      businessName: 'TechCorp UK',
      country: 'United Kingdom',
      messagesCount: 892,
      contactsCount: 654,
      lastActivity: '15 minutes ago',
      createdAt: '2024-01-18',
      qualityRating: 'Medium',
      rateLimit: '500/hour',
      messagesUsed: '123/500'
    },
    {
      id: 3,
      phoneNumber: '+49 30 12345678',
      displayName: 'Germany Support',
      status: 'pending',
      health: 'warning',
      businessName: 'TechCorp DE',
      country: 'Germany',
      messagesCount: 234,
      contactsCount: 321,
      lastActivity: '1 hour ago',
      createdAt: '2024-01-20',
      qualityRating: 'High',
      rateLimit: '750/hour',
      messagesUsed: '45/750'
    },
    {
      id: 4,
      phoneNumber: '+33 1 42 86 83 26',
      displayName: 'France Marketing',
      status: 'inactive',
      health: 'error',
      businessName: 'TechCorp FR',
      country: 'France',
      messagesCount: 156,
      contactsCount: 198,
      lastActivity: '2 days ago',
      createdAt: '2024-01-12',
      qualityRating: 'Low',
      rateLimit: '250/hour',
      messagesUsed: '12/250'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getQualityColor = (rating: string) => {
    switch (rating) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredNumbers = numbers.filter(number => {
    const matchesSearch = number.phoneNumber.includes(searchTerm) ||
                         number.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         number.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || number.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleSelectNumber = (id: number) => {
    setSelectedNumbers(prev => 
      prev.includes(id) 
        ? prev.filter(numberId => numberId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNumbers.length === filteredNumbers.length) {
      setSelectedNumbers([]);
    } else {
      setSelectedNumbers(filteredNumbers.map(n => n.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Phone className="w-8 h-8 text-blue-600 mr-3" />
                Multi-Number Management
              </h1>
              <p className="text-gray-600 mt-1">Manage multiple WhatsApp Business numbers from one dashboard</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Add Number
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Numbers</p>
                <p className="text-2xl font-bold text-gray-900">{numbers.length}</p>
              </div>
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Numbers</p>
                <p className="text-2xl font-bold text-green-600">
                  {numbers.filter(n => n.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {numbers.reduce((sum, n) => sum + n.messagesCount, 0).toLocaleString()}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {numbers.reduce((sum, n) => sum + n.contactsCount, 0).toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNumbers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedNumbers.length} number{selectedNumbers.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-3">
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Activate Selected
                </button>
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Deactivate Selected
                </button>
                <button className="text-red-600 hover:text-red-700 font-medium">
                  Delete Selected
                </button>
                <button 
                  onClick={() => setSelectedNumbers([])}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Numbers List */}
        <div className="space-y-4">
          {filteredNumbers.map((number) => (
            <div key={number.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedNumbers.includes(number.id)}
                      onChange={() => handleSelectNumber(number.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                    />
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{number.displayName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(number.status)}`}>
                          {number.status.charAt(0).toUpperCase() + number.status.slice(1)}
                        </span>
                        <div className="flex items-center space-x-1">
                          {getHealthIcon(number.health)}
                          <span className="text-sm text-gray-600">Health</span>
                        </div>
                      </div>
                      <p className="text-gray-600 font-mono text-sm">{number.phoneNumber}</p>
                      <p className="text-gray-500 text-sm">{number.businessName} • {number.country}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Created: {number.createdAt}</span>
                        <span>•</span>
                        <span>Last active: {number.lastActivity}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Settings className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-red-400 hover:text-red-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Number Details */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Messages Sent</p>
                        <p className="text-xl font-bold text-gray-900">{number.messagesCount.toLocaleString()}</p>
                      </div>
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Contacts</p>
                        <p className="text-xl font-bold text-gray-900">{number.contactsCount.toLocaleString()}</p>
                      </div>
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Quality Rating</p>
                        <p className={`text-xl font-bold ${getQualityColor(number.qualityRating)}`}>
                          {number.qualityRating}
                        </p>
                      </div>
                      <BarChart3 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Rate Limit</p>
                        <p className="text-sm text-gray-900">{number.rateLimit}</p>
                        <p className="text-xs text-gray-600">Used: {number.messagesUsed}</p>
                      </div>
                      <Activity className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNumbers.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No numbers found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first WhatsApp Business number.'
              }
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center mx-auto">
              <Plus className="w-5 h-5 mr-2" />
              Add Number
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiNumber;