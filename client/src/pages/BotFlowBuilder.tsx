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
  Plus, 
  Play, 
  Save, 
  Download, 
  Upload, 
  Settings, 
  MessageCircle, 
  ArrowRight, 
  Trash2, 
  Copy, 
  Edit,
  Zap,
  Clock,
  Users,
  BarChart3,
  Bot,
  Workflow
} from 'lucide-react';

const BotFlowBuilder = () => {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [flowName, setFlowName] = useState('Welcome Bot Flow');

  const nodeTypes = [
    {
      type: 'trigger',
      name: 'Trigger',
      icon: Zap,
      color: 'bg-green-500',
      description: 'Start the conversation'
    },
    {
      type: 'message',
      name: 'Send Message',
      icon: MessageCircle,
      color: 'bg-blue-500',
      description: 'Send a text message'
    },
    {
      type: 'condition',
      name: 'Condition',
      icon: ArrowRight,
      color: 'bg-yellow-500',
      description: 'Branch based on conditions'
    },
    {
      type: 'delay',
      name: 'Delay',
      icon: Clock,
      color: 'bg-purple-500',
      description: 'Wait before next action'
    },
    {
      type: 'collect',
      name: 'Collect Input',
      icon: Users,
      color: 'bg-orange-500',
      description: 'Get user response'
    }
  ];

  const flowNodes = [
    {
      id: 1,
      type: 'trigger',
      title: 'Welcome Trigger',
      content: 'Keywords: hello, hi, start',
      position: { x: 100, y: 100 },
      connections: [2]
    },
    {
      id: 2,
      type: 'message',
      title: 'Welcome Message',
      content: 'Hello! Welcome to our service. How can I help you today?',
      position: { x: 300, y: 100 },
      connections: [3]
    },
    {
      id: 3,
      type: 'condition',
      title: 'Check Intent',
      content: 'If contains "product" → 4\nIf contains "support" → 5\nElse → 6',
      position: { x: 500, y: 100 },
      connections: [4, 5, 6]
    },
    {
      id: 4,
      type: 'message',
      title: 'Product Info',
      content: 'Here are our products...',
      position: { x: 400, y: 250 },
      connections: []
    },
    {
      id: 5,
      type: 'message',
      title: 'Support Message',
      content: 'I\'ll connect you with support...',
      position: { x: 600, y: 250 },
      connections: []
    },
    {
      id: 6,
      type: 'collect',
      title: 'Collect Info',
      content: 'Can you tell me more about what you need?',
      position: { x: 500, y: 300 },
      connections: []
    }
  ];

  const templates = [
    {
      id: 1,
      name: 'Customer Support Bot',
      description: 'Handle common support queries automatically',
      nodes: 8,
      category: 'Support'
    },
    {
      id: 2,
      name: 'Lead Qualification',
      description: 'Qualify leads and collect contact information',
      nodes: 12,
      category: 'Sales'
    },
    {
      id: 3,
      name: 'Order Status Checker',
      description: 'Help customers check their order status',
      nodes: 6,
      category: 'E-commerce'
    },
    {
      id: 4,
      name: 'Appointment Booking',
      description: 'Book appointments automatically',
      nodes: 15,
      category: 'Booking'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Bot className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bot Flow Builder</h1>
                <p className="text-gray-600">Design intelligent chat automation</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </button>
              <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center">
                <Play className="w-4 h-4 mr-2" />
                Test Flow
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Left Sidebar - Node Types */}
        <div className="w-80 bg-white border-r border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Flow Components</h3>
            <div className="space-y-3">
              {nodeTypes.map((node, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-all hover:shadow-md"
                  draggable
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${node.color} p-2 rounded-lg`}>
                      <node.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{node.name}</h4>
                      <p className="text-sm text-gray-600">{node.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates</h3>
            <div className="space-y-3">
              {templates.map(template => (
                <div key={template.id} className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{template.nodes} nodes</span>
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {/* Canvas Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
              />
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>6 nodes</span>
                <span>•</span>
                <span>Last saved: 2 min ago</span>
                <span>•</span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="h-full bg-gray-50 relative overflow-auto">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              {/* Flow Nodes */}
              {flowNodes.map(node => (
                <div
                  key={node.id}
                  className={`absolute bg-white border-2 rounded-lg p-4 cursor-pointer shadow-md hover:shadow-lg transition-all ${
                    selectedNode?.id === node.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                  style={{ left: node.position.x, top: node.position.y, width: '200px' }}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {(() => {
                      const nodeType = nodeTypes.find(t => t.type === node.type);
                      const Icon = nodeType?.icon || MessageCircle;
                      return (
                        <div className={`${nodeType?.color || 'bg-gray-500'} p-1 rounded`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                      );
                    })()}
                    <h4 className="font-medium text-gray-900 text-sm">{node.title}</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{node.content}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {node.connections.length > 0 && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}

              {/* Connection Lines */}
              <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                {flowNodes.map(node => 
                  node.connections.map(targetId => {
                    const target = flowNodes.find(n => n.id === targetId);
                    if (!target) return null;
                    
                    const startX = node.position.x + 200;
                    const startY = node.position.y + 50;
                    const endX = target.position.x;
                    const endY = target.position.y + 50;
                    
                    return (
                      <line
                        key={`${node.id}-${targetId}`}
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })
                )}
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          {selectedNode ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Node Properties</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Node Title
                  </label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedNode.type === 'message' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Content
                    </label>
                    <textarea
                      value={selectedNode.content}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {selectedNode.type === 'trigger' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trigger Keywords
                    </label>
                    <input
                      type="text"
                      value={selectedNode.content}
                      placeholder="hello, hi, start"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {selectedNode.type === 'delay' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delay Duration
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>5 seconds</option>
                      <option>30 seconds</option>
                      <option>1 minute</option>
                      <option>5 minutes</option>
                      <option>1 hour</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Node Actions
                  </label>
                  <div className="space-y-2">
                    <button className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors">
                      Update Node
                    </button>
                    <button className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                      Duplicate Node
                    </button>
                    <button className="w-full bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 transition-colors">
                      Delete Node
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Workflow className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Node Selected</h3>
              <p className="text-gray-500">Click on a node to edit its properties</p>
            </div>
          )}

          <div className="border-t pt-6 mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Flow Statistics</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Nodes</span>
                <span className="font-medium">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Triggers</span>
                <span className="font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Messages</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Conditions</span>
                <span className="font-medium">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotFlowBuilder;