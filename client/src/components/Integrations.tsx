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
  Zap,
  ArrowRight,
  CheckCircle,
  Code,
  Globe,
  Workflow,
  Database,
  ShoppingCart,
  Mail,
  Calendar,
  Users,
  MessageSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

const Integrations = () => {
  const [activeCategory, setActiveCategory] = useState("automation");

  const categories = [
    { id: "automation", name: "Automation", icon: Zap },
    { id: "ecommerce", name: "E-commerce", icon: ShoppingCart },
    { id: "crm", name: "CRM & Sales", icon: Users },
    { id: "marketing", name: "Marketing", icon: Mail },
    { id: "productivity", name: "Productivity", icon: Calendar },
  ];

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title ?? "";

  const integrations = {
    automation: [
      {
        name: "Make.com (Integromat)",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description:
          "Connect WPSaaS with 1000+ apps using visual automation workflows",
        features: [
          "Visual workflow builder",
          "Real-time triggers",
          "Data transformation",
          "Error handling",
        ],
        category: "No-code Automation",
        popular: true,
      },
      {
        name: "Zapier",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Automate workflows between WPSaaS and 5000+ applications",
        features: [
          "Multi-step workflows",
          "Conditional logic",
          "Filters & formatters",
          "Team collaboration",
        ],
        category: "Workflow Automation",
      },
      {
        name: "Microsoft Power Automate",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description:
          "Enterprise automation with Microsoft ecosystem integration",
        features: [
          "Office 365 integration",
          "AI Builder",
          "Approval workflows",
          "Desktop automation",
        ],
        category: "Enterprise Automation",
      },
      {
        name: "n8n",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description:
          "Open-source workflow automation with self-hosting options",
        features: [
          "Self-hosted option",
          "Custom nodes",
          "Version control",
          "Advanced scheduling",
        ],
        category: "Open Source",
      },
    ],
    ecommerce: [
      {
        name: "Shopify",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description:
          "Sync orders, customers, and inventory with your Shopify store",
        features: [
          "Order notifications",
          "Abandoned cart recovery",
          "Customer sync",
          "Inventory updates",
        ],
        category: "E-commerce Platform",
        popular: true,
      },
      {
        name: "WooCommerce",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "WordPress e-commerce integration for order management",
        features: [
          "WordPress integration",
          "Order tracking",
          "Customer notifications",
          "Product updates",
        ],
        category: "WordPress E-commerce",
      },
      {
        name: "BigCommerce",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Enterprise e-commerce platform integration",
        features: [
          "Multi-channel selling",
          "Advanced analytics",
          "API-first approach",
          "Scalable infrastructure",
        ],
        category: "Enterprise E-commerce",
      },
      {
        name: "Magento",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description:
          "Flexible e-commerce solution with extensive customization",
        features: [
          "Multi-store management",
          "B2B features",
          "Advanced SEO",
          "Custom development",
        ],
        category: "Flexible E-commerce",
      },
    ],
    crm: [
      {
        name: "Salesforce",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "World's #1 CRM with deep WhatsApp integration",
        features: [
          "Lead management",
          "Opportunity tracking",
          "Custom fields",
          "Advanced reporting",
        ],
        category: "Enterprise CRM",
        popular: true,
      },
      {
        name: "HubSpot",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "All-in-one marketing, sales, and service platform",
        features: [
          "Contact management",
          "Deal pipeline",
          "Marketing automation",
          "Service tickets",
        ],
        category: "All-in-one CRM",
      },
      {
        name: "Pipedrive",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Sales-focused CRM designed for closing deals",
        features: [
          "Visual pipeline",
          "Activity reminders",
          "Email integration",
          "Mobile app",
        ],
        category: "Sales CRM",
      },
      {
        name: "Airtable",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Flexible database with CRM capabilities",
        features: [
          "Custom databases",
          "Collaboration tools",
          "Automation",
          "API access",
        ],
        category: "Database CRM",
      },
    ],
    marketing: [
      {
        name: "Mailchimp",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Email marketing platform with audience sync",
        features: [
          "Audience segmentation",
          "Email campaigns",
          "Marketing automation",
          "Analytics",
        ],
        category: "Email Marketing",
        popular: true,
      },
      {
        name: "ConvertKit",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Creator-focused email marketing with automation",
        features: [
          "Visual automations",
          "Tagging system",
          "Landing pages",
          "Commerce integration",
        ],
        category: "Creator Marketing",
      },
      {
        name: "ActiveCampaign",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Customer experience automation platform",
        features: [
          "Behavioral triggers",
          "Predictive sending",
          "Site tracking",
          "CRM integration",
        ],
        category: "Marketing Automation",
      },
      {
        name: "Klaviyo",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "E-commerce focused email and SMS marketing",
        features: [
          "E-commerce integration",
          "Predictive analytics",
          "Segmentation",
          "A/B testing",
        ],
        category: "E-commerce Marketing",
      },
    ],
    productivity: [
      {
        name: "Google Workspace",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Integrate with Gmail, Sheets, Calendar, and Drive",
        features: [
          "Gmail integration",
          "Google Sheets sync",
          "Calendar events",
          "Drive storage",
        ],
        category: "Productivity Suite",
        popular: true,
      },
      {
        name: "Microsoft 365",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Office suite integration with Teams and Outlook",
        features: [
          "Outlook sync",
          "Teams notifications",
          "Excel integration",
          "OneDrive storage",
        ],
        category: "Office Suite",
      },
      {
        name: "Slack",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "Team communication with WhatsApp notifications",
        features: [
          "Channel notifications",
          "Direct messages",
          "File sharing",
          "App integrations",
        ],
        category: "Team Communication",
      },
      {
        name: "Notion",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
        description: "All-in-one workspace for notes, docs, and databases",
        features: [
          "Database sync",
          "Page updates",
          "Task management",
          "Team collaboration",
        ],
        category: "Workspace",
      },
    ],
  };

  const apiFeatures = [
    {
      icon: Code,
      title: "RESTful API",
      description:
        "Clean, well-documented REST API with comprehensive endpoints",
    },
    {
      icon: Zap,
      title: "Real-time Webhooks",
      description:
        "Instant notifications for message events and status updates",
    },
    {
      icon: Database,
      title: "Bulk Operations",
      description:
        "Handle large-scale operations efficiently with batch processing",
    },
    {
      icon: Globe,
      title: "Global Infrastructure",
      description: "Low-latency API access from anywhere in the world",
    },
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-green-100 p-4 rounded-full w-fit mx-auto mb-6">
            <Workflow className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Connect Everything with
            <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Our API & Integrations
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Seamlessly integrate WPSaaS with your existing tools and workflows.
            Connect with 1000+ applications or build custom integrations with
            our powerful API.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-green-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-600 transition-all transform hover:scale-105 shadow-xl">
              Explore API
            </button>
            <button className="border-2 border-green-500 text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-green-50 transition-all">
              View Integrations
            </button>
          </div>
        </div>
      </section>

      {/* API Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful API Features
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to build amazing integrations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {apiFeatures.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="bg-green-100 p-4 rounded-xl w-fit mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Categories */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Popular Integrations
            </h2>
            <p className="text-xl text-gray-600">
              Connect with your favorite tools and platforms
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  activeCategory === category.id
                    ? "bg-green-500 text-white shadow-lg transform scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-100 shadow-md"
                }`}
              >
                <category.icon className="w-5 h-5" />
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Integration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {integrations[activeCategory as keyof typeof integrations].map(
              (integration, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={integration.logo}
                      alt={integration.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-gray-900">
                          {integration.name}
                        </h3>
                        {integration.popular && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-green-600 font-medium">
                        {integration.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 text-sm">
                    {integration.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    {integration.features
                      .slice(0, 3)
                      .map((feature, featureIndex) => (
                        <div
                          key={featureIndex}
                          className="flex items-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600">
                            {feature}
                          </span>
                        </div>
                      ))}
                  </div>

                  <button className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                    Connect Now
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Make.com Spotlight */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-purple-100 p-3 rounded-lg w-fit mb-6">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Supercharge with Make.com
              </h2>
              <p className="text-gray-600 mb-6">
                Create powerful automation workflows without coding. Connect
                {appName} with 1000+ apps using Make.com's visual workflow
                builder and transform your business processes.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  "Visual drag-and-drop workflow builder",
                  "Real-time data synchronization",
                  "Advanced conditional logic",
                  "Error handling and monitoring",
                  "Pre-built templates for common workflows",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <button className="bg-purple-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-600 transition-all flex items-center group">
                Start with Make.com
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Popular Workflow Examples
              </h3>
              <div className="space-y-4">
                {[
                  {
                    trigger: "New Shopify Order",
                    action: "Send WhatsApp Confirmation",
                    icon: ShoppingCart,
                  },
                  {
                    trigger: "Form Submission",
                    action: "Add to WhatsApp Campaign",
                    icon: MessageSquare,
                  },
                  {
                    trigger: "Calendar Event",
                    action: "Send Appointment Reminder",
                    icon: Calendar,
                  },
                ].map((workflow, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <workflow.icon className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {workflow.trigger}
                        </div>
                        <div className="text-xs text-gray-600">
                          → {workflow.action}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Integration CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need a Custom Integration?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Our API makes it easy to build custom integrations. Get started with
            our comprehensive documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl">
              View API Documentation
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-green-600 transition-all">
              Contact Integration Team
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Integrations;
