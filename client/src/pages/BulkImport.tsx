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
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Users,
  Database,
  ArrowRight,
  RefreshCw,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const BulkImport = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<
    "idle" | "processing" | "completed" | "error"
  >("idle");
  const [showSteps, setShowSteps] = useState(false);

  const importHistory = [
    {
      id: 1,
      fileName: "customer_contacts_jan_2024.csv",
      status: "completed",
      totalRecords: 1247,
      successfulImports: 1198,
      errors: 49,
      importedAt: "2024-01-20 14:30",
      duration: "2m 15s",
    },
    {
      id: 2,
      fileName: "leads_database.xlsx",
      status: "completed",
      totalRecords: 892,
      successfulImports: 876,
      errors: 16,
      importedAt: "2024-01-18 09:45",
      duration: "1m 42s",
    },
    {
      id: 3,
      fileName: "newsletter_subscribers.csv",
      status: "error",
      totalRecords: 2341,
      successfulImports: 0,
      errors: 2341,
      importedAt: "2024-01-15 16:20",
      duration: "0m 30s",
    },
  ];

  const validationResults = {
    valid: 1198,
    duplicates: 23,
    invalidPhone: 15,
    missingRequired: 11,
    total: 1247,
  };

  const steps = [
    {
      number: 1,
      title: "Upload File",
      description: "Select your CSV or Excel file",
    },
    {
      number: 2,
      title: "Map Fields",
      description: "Match columns to contact fields",
    },
    {
      number: 3,
      title: "Validate Data",
      description: "Review and fix any issues",
    },
    { number: 4, title: "Import", description: "Complete the import process" },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setActiveStep(2);
    }
  };

  const handleImport = () => {
    setImportStatus("processing");
    setTimeout(() => {
      setImportStatus("completed");
      setActiveStep(4);
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />;
      case "processing":
        return (
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 animate-spin" />
        );
      default:
        return (
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  Bulk Import
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Import contacts from CSV or Excel files
                </p>
              </div>
            </div>
            <button className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center text-sm sm:text-base">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Progress Steps - Mobile Compact Version */}
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6 lg:mb-8">
          {/* Mobile: Compact Progress */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-semibold">
                  {activeStep}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {steps[activeStep - 1].title}
                  </div>
                  <div className="text-xs text-gray-500">
                    Step {activeStep} of {steps.length}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle steps"
              >
                {showSteps ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(activeStep / steps.length) * 100}%` }}
              />
            </div>

            {/* Expandable Steps */}
            {showSteps && (
              <div className="space-y-2 pt-3 border-t border-gray-200">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className={`flex items-center space-x-3 p-2 rounded-lg ${
                      activeStep === step.number ? "bg-green-50" : ""
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        activeStep >= step.number
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {activeStep > step.number ? "✓" : step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          activeStep >= step.number
                            ? "text-gray-900"
                            : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop: Full Horizontal Stepper */}
          <div className="hidden lg:flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    activeStep >= step.number
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 text-gray-500"
                  }`}
                >
                  {activeStep > step.number ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{step.number}</span>
                  )}
                </div>
                <div className="ml-4">
                  <div
                    className={`font-medium ${
                      activeStep >= step.number
                        ? "text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {step.description}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-gray-400 mx-6 xl:mx-8" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Import Area */}
          <div className="lg:col-span-2">
            {/* Step 1: Upload File */}
            {activeStep === 1 && (
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Upload Your File
                </h2>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 lg:p-12 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    Drop your file here or click to browse
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-4">
                    Supports CSV, Excel (.xlsx, .xls) files up to 10MB
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-blue-500 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg hover:bg-blue-600 transition-colors cursor-pointer inline-block"
                  >
                    Choose File
                  </label>
                </div>

                <div className="mt-4 sm:mt-6 bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">
                    Required Fields:
                  </h4>
                  <ul className="text-blue-800 text-xs sm:text-sm space-y-1">
                    <li>• Phone Number (required)</li>
                    <li>• Name (recommended)</li>
                    <li>• Email (optional)</li>
                    <li>• Company (optional)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Map Fields */}
            {activeStep === 2 && uploadedFile && (
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Map Your Fields
                </h2>

                <div className="space-y-3 sm:space-y-4">
                  {[
                    {
                      csvColumn: "full_name",
                      suggestedField: "Name",
                      required: false,
                    },
                    {
                      csvColumn: "phone_number",
                      suggestedField: "Phone",
                      required: true,
                    },
                    {
                      csvColumn: "email_address",
                      suggestedField: "Email",
                      required: false,
                    },
                    {
                      csvColumn: "company_name",
                      suggestedField: "Company",
                      required: false,
                    },
                    {
                      csvColumn: "job_title",
                      suggestedField: "Position",
                      required: false,
                    },
                  ].map((mapping, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="font-medium text-gray-900 text-sm sm:text-base">
                          {mapping.csvColumn}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue={mapping.suggestedField}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Do Not Import</option>
                          <option value="Name">Name</option>
                          <option value="Phone">Phone</option>
                          <option value="Email">Email</option>
                          <option value="Company">Company</option>
                          <option value="Position">Position</option>
                          <option value="Tags">Tags</option>
                          <option value="Notes">Notes</option>
                        </select>
                        {mapping.required && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:justify-between">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setActiveStep(3)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Validate Data */}
            {activeStep === 3 && (
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Validate Your Data
                </h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1">
                      {validationResults.valid}
                    </div>
                    <div className="text-xs sm:text-sm text-green-800">
                      Valid Records
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-yellow-600 mb-1">
                      {validationResults.duplicates}
                    </div>
                    <div className="text-xs sm:text-sm text-yellow-800">
                      Duplicates
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-red-600 mb-1">
                      {validationResults.invalidPhone}
                    </div>
                    <div className="text-xs sm:text-sm text-red-800">
                      Invalid Phone
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-red-600 mb-1">
                      {validationResults.missingRequired}
                    </div>
                    <div className="text-xs sm:text-sm text-red-800">
                      Missing Fields
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                      Data Preview
                    </h3>
                    <span className="text-xs sm:text-sm text-gray-500">
                      Showing 5 of {validationResults.total} records
                    </span>
                  </div>

                  {/* Mobile: Card View */}
                  <div className="lg:hidden space-y-3">
                    {[
                      {
                        name: "John Smith",
                        phone: "+1 (555) 123-4567",
                        email: "john@example.com",
                        company: "ABC Corp",
                        status: "valid",
                      },
                      {
                        name: "Sarah Johnson",
                        phone: "+1 (555) 234-5678",
                        email: "sarah@example.com",
                        company: "XYZ Inc",
                        status: "valid",
                      },
                      {
                        name: "Michael Brown",
                        phone: "555-345-6789",
                        email: "michael@example.com",
                        company: "Acme Co",
                        status: "invalid-phone",
                      },
                    ].map((record, index) => (
                      <div
                        key={index}
                        className="bg-white p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-gray-900 text-sm">
                            {record.name}
                          </div>
                          {record.status === "valid" && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Valid
                            </span>
                          )}
                          {record.status === "invalid-phone" && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                              Invalid
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>📞 {record.phone}</div>
                          <div>✉️ {record.email}</div>
                          <div>🏢 {record.company}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Phone
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Company
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[
                          {
                            name: "John Smith",
                            phone: "+1 (555) 123-4567",
                            email: "john@example.com",
                            company: "ABC Corp",
                            status: "valid",
                          },
                          {
                            name: "Sarah Johnson",
                            phone: "+1 (555) 234-5678",
                            email: "sarah@example.com",
                            company: "XYZ Inc",
                            status: "valid",
                          },
                          {
                            name: "Michael Brown",
                            phone: "555-345-6789",
                            email: "michael@example.com",
                            company: "Acme Co",
                            status: "invalid-phone",
                          },
                          {
                            name: "Emily Davis",
                            phone: "+1 (555) 456-7890",
                            email: "emily@example.com",
                            company: "Tech Solutions",
                            status: "duplicate",
                          },
                          {
                            name: "David Wilson",
                            phone: "",
                            email: "david@example.com",
                            company: "Global Inc",
                            status: "missing-required",
                          },
                        ].map((record, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {record.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {record.phone}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {record.email}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {record.company}
                            </td>
                            <td className="px-4 py-2">
                              {record.status === "valid" && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                  Valid
                                </span>
                              )}
                              {record.status === "invalid-phone" && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                  Invalid Phone
                                </span>
                              )}
                              {record.status === "duplicate" && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                  Duplicate
                                </span>
                              )}
                              {record.status === "missing-required" && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                  Missing Phone
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200 mb-4 sm:mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-800 mb-1 text-sm sm:text-base">
                        Validation Issues
                      </h4>
                      <p className="text-xs sm:text-sm text-yellow-700">
                        There are{" "}
                        {validationResults.duplicates +
                          validationResults.invalidPhone +
                          validationResults.missingRequired}{" "}
                        records with issues. You can proceed with import and
                        skip invalid records, or go back to fix the issues.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:justify-between">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Import {validationResults.valid} Valid Records
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Import Complete */}
            {activeStep === 4 && (
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm border border-gray-200">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="bg-green-100 p-3 sm:p-4 rounded-full w-fit mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    Import Completed!
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    {validationResults.valid} contacts were successfully
                    imported.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      {validationResults.valid}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Successful Imports
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      {validationResults.duplicates +
                        validationResults.invalidPhone +
                        validationResults.missingRequired}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Skipped Records
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      2m 15s
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Processing Time
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:space-x-4">
                  <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </button>
                  <button
                    onClick={() => {
                      setActiveStep(1);
                      setUploadedFile(null);
                      setImportStatus("idle");
                    }}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Start New Import
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Import History */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                Recent Imports
              </h3>

              <div className="space-y-3 sm:space-y-4">
                {importHistory.map((history) => (
                  <div
                    key={history.id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="font-medium text-gray-900 text-xs sm:text-sm break-all">
                          {history.fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getStatusIcon(history.status)}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-2">
                      {history.importedAt} • {history.duration}
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">
                        {history.successfulImports}/{history.totalRecords}
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-700 p-1">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-700 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                Import Tips
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-600">
                    Ensure phone numbers include country code (e.g., +1 for US)
                  </p>
                </div>
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-600">
                    Use our template for best results and fewer errors
                  </p>
                </div>
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-600">
                    Remove duplicates before importing to avoid confusion
                  </p>
                </div>
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-600">
                    Limit imports to 10,000 contacts per file for best
                    performance
                  </p>
                </div>
              </div>

              <button className="w-full mt-3 sm:mt-4 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm">
                View Import Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImport;
