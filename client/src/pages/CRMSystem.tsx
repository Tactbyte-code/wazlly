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

import React, { useState } from "react";
import {
  Database,
  Plus,
  Search,
  Filter,
  Users,
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Star,
  Tag,
  Activity,
  ChevronDown,
} from "lucide-react";

const CRMSystem = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("contacts");
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const contacts = [
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      company: "TechCorp Inc.",
      status: "lead",
      value: 5000,
      lastContact: "2 days ago",
      source: "Website",
      tags: ["hot-lead", "enterprise"],
      avatar:
        "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      phone: "+1 (555) 234-5678",
      company: "StartupXYZ",
      status: "customer",
      value: 12000,
      lastContact: "1 week ago",
      source: "Referral",
      tags: ["customer", "recurring"],
      avatar:
        "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    },
    {
      id: 3,
      name: "Michael Brown",
      email: "michael.brown@example.com",
      phone: "+1 (555) 345-6789",
      company: "Global Solutions",
      status: "prospect",
      value: 8000,
      lastContact: "3 days ago",
      source: "LinkedIn",
      tags: ["prospect", "follow-up"],
      avatar:
        "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily.davis@example.com",
      phone: "+1 (555) 456-7890",
      company: "Innovation Labs",
      status: "lead",
      value: 3500,
      lastContact: "5 days ago",
      source: "WhatsApp",
      tags: ["lead", "interested"],
      avatar:
        "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    },
  ];

  const deals = [
    {
      id: 1,
      title: "Enterprise Software License",
      company: "TechCorp Inc.",
      value: 50000,
      stage: "negotiation",
      probability: 75,
      closeDate: "2024-02-15",
      contact: "John Smith",
    },
    {
      id: 2,
      title: "Marketing Automation Setup",
      company: "StartupXYZ",
      value: 15000,
      stage: "proposal",
      probability: 60,
      closeDate: "2024-02-28",
      contact: "Sarah Johnson",
    },
    {
      id: 3,
      title: "Consulting Services",
      company: "Global Solutions",
      value: 25000,
      stage: "qualified",
      probability: 40,
      closeDate: "2024-03-10",
      contact: "Michael Brown",
    },
  ];

  const activities = [
    {
      id: 1,
      type: "call",
      description: "Called John Smith about enterprise requirements",
      contact: "John Smith",
      timestamp: "2 hours ago",
    },
    {
      id: 2,
      type: "email",
      description: "Sent proposal to Sarah Johnson",
      contact: "Sarah Johnson",
      timestamp: "1 day ago",
    },
    {
      id: 3,
      type: "meeting",
      description: "Demo meeting with Michael Brown",
      contact: "Michael Brown",
      timestamp: "2 days ago",
    },
  ];

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || contact.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lead":
        return "bg-yellow-100 text-yellow-800";
      case "prospect":
        return "bg-blue-100 text-blue-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "qualified":
        return "bg-blue-100 text-blue-800";
      case "proposal":
        return "bg-yellow-100 text-yellow-800";
      case "negotiation":
        return "bg-orange-100 text-orange-800";
      case "closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSelectContact = (id: number) => {
    setSelectedContacts((prev) =>
      prev.includes(id)
        ? prev.filter((contactId) => contactId !== id)
        : [...prev, id]
    );
  };

  const toggleDropdown = (id: number) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  CRM System
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Manage contacts, deals, and relationships
                </p>
              </div>
            </div>
            <button className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center text-sm sm:text-base">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {[
            {
              title: "Total Contacts",
              value: contacts.length.toString(),
              icon: Users,
              color: "blue",
            },
            {
              title: "Active Deals",
              value: deals.length.toString(),
              icon: DollarSign,
              color: "green",
            },
            {
              title: "Pipeline Value",
              value: `$${deals
                .reduce((sum, deal) => sum + deal.value, 0)
                .toLocaleString()}`,
              icon: TrendingUp,
              color: "purple",
            },
            {
              title: "Conversion Rate",
              value: "24%",
              icon: Activity,
              color: "orange",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    {stat.title}
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`p-2 sm:p-3 rounded-lg bg-${stat.color}-100 flex-shrink-0 ml-2`}
                >
                  <stat.icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}-600`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max">
              {[
                { id: "contacts", name: "Contacts", icon: Users },
                { id: "deals", name: "Deals", icon: DollarSign },
                { id: "activities", name: "Activities", icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Contacts Tab */}
          {activeTab === "contacts" && (
            <div className="p-4 sm:p-6">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              {/* Contacts List */}
              <div className="space-y-3 sm:space-y-4">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox + Avatar */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => handleSelectContact(contact.id)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name & Company */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                              {contact.name}
                            </h3>
                            <p className="text-gray-600 text-xs sm:text-sm truncate">
                              {contact.company}
                            </p>
                          </div>

                          {/* Desktop Actions */}
                          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Mobile Dropdown */}
                          <div className="relative lg:hidden flex-shrink-0">
                            <button
                              onClick={() => toggleDropdown(contact.id)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              aria-label="More actions"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {openDropdown === contact.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenDropdown(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                    <Eye className="w-4 h-4" />
                                    View
                                  </button>
                                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <div className="border-t border-gray-200 my-1"></div>
                                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Contact Info - Stacked on mobile */}
                        <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-600 truncate">
                              {contact.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-600">
                              {contact.phone}
                            </span>
                          </div>
                        </div>

                        {/* Status & Value */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              contact.status
                            )}`}
                          >
                            {contact.status}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900">
                            ${contact.value.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            • {contact.lastContact}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deals Tab */}
          {activeTab === "deals" && (
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                          {deal.title}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm">
                          {deal.company} • {deal.contact}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                        <div className="flex-1 sm:flex-initial">
                          <div className="text-base sm:text-lg font-bold text-gray-900">
                            ${deal.value.toLocaleString()}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            {deal.probability}% probability
                          </div>
                        </div>

                        <div className="flex-1 sm:flex-initial">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(
                              deal.stage
                            )}`}
                          >
                            {deal.stage}
                          </span>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">
                            {deal.closeDate}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === "activities" && (
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base text-gray-900 mb-1">
                          {activity.description}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {activity.contact} • {activity.timestamp}
                        </p>
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
  );
};

export default CRMSystem;
