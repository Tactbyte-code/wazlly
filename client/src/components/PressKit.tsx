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

import React from "react";
import {
  Download,
  Image,
  FileText,
  Video,
  Palette,
  MessageCircle,
  Users,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

const PressKit = () => {
  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title ?? "";
  const assets = [
    {
      category: "Logos",
      icon: Palette,
      items: [
        { name: "WPSaaS Logo (PNG)", size: "2.1 MB", format: "PNG" },
        { name: "WPSaaS Logo (SVG)", size: "45 KB", format: "SVG" },
        { name: "WPSaaS Logo Dark", size: "1.8 MB", format: "PNG" },
        { name: "WPSaaS Icon Only", size: "890 KB", format: "PNG" },
      ],
    },
    {
      category: "Screenshots",
      icon: Image,
      items: [
        { name: "Dashboard Overview", size: "3.2 MB", format: "PNG" },
        { name: "Campaign Builder", size: "2.8 MB", format: "PNG" },
        { name: "Analytics Dashboard", size: "3.1 MB", format: "PNG" },
        { name: "Mobile App Interface", size: "2.4 MB", format: "PNG" },
      ],
    },
    {
      category: "Documents",
      icon: FileText,
      items: [
        { name: "Company Fact Sheet", size: "156 KB", format: "PDF" },
        { name: "Executive Bios", size: "234 KB", format: "PDF" },
        { name: "Product Overview", size: "1.2 MB", format: "PDF" },
        { name: "Brand Guidelines", size: "4.5 MB", format: "PDF" },
      ],
    },
    {
      category: "Videos",
      icon: Video,
      items: [
        { name: "Product Demo Video", size: "45 MB", format: "MP4" },
        { name: "CEO Interview", size: "78 MB", format: "MP4" },
        { name: "Customer Success Story", size: "32 MB", format: "MP4" },
        { name: "Platform Overview", size: "28 MB", format: "MP4" },
      ],
    },
  ];

  const companyInfo = {
    founded: "2023",
    headquarters: "San Francisco, CA",
    employees: "50+",
    customers: "10,000+",
    funding: "Series A",
    valuation: "$50M",
  };

  const keyStats = [
    { label: "Messages Sent Monthly", value: "50M+", icon: MessageCircle },
    { label: "Active Users", value: "10,000+", icon: Users },
    { label: "Revenue Growth (YoY)", value: "300%", icon: TrendingUp },
    { label: "Countries Served", value: "150+", icon: MessageCircle },
  ];

  const executiveTeam = [
    {
      name: "Sarah Johnson",
      role: "CEO & Co-Founder",
      bio: "Former WhatsApp Business API engineer with 10+ years in messaging platforms. Previously led product at Meta.",
      image:
        "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop",
    },
    {
      name: "Michael Chen",
      role: "CTO & Co-Founder",
      bio: "Ex-Meta engineer specializing in scalable messaging infrastructure. PhD in Computer Science from Stanford.",
      image:
        "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop",
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Product",
      bio: "Product strategist with expertise in SaaS platforms. Former product lead at Salesforce and HubSpot.",
      image:
        "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop",
    },
  ];

  const recentNews = [
    {
      date: "January 15, 2025",
      title:
        "WPSaaS Raises $15M Series A to Expand WhatsApp Marketing Platform",
      publication: "TechCrunch",
      link: "#",
    },
    {
      date: "December 10, 2024",
      title: "The Future of Business Communication: WhatsApp Marketing Trends",
      publication: "Forbes",
      link: "#",
    },
    {
      date: "November 22, 2024",
      title: `${appName} Named to Fast Company's Most Innovative Companies List",
      publication: "Fast Company`,
      link: "#",
    },
    {
      date: "October 5, 2024",
      title: "How Small Businesses Are Leveraging WhatsApp for Growth",
      publication: "Wall Street Journal",
      link: "#",
    },
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-green-100 p-4 rounded-full w-fit mx-auto mb-6">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Press
            <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Kit
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about WPSaaS. Download our media assets,
            company information, and latest news updates.
          </p>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                About WPSaaS
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  WPSaaS is the leading WhatsApp marketing platform that enables
                  businesses to connect their own Meta WhatsApp Business API and
                  create powerful marketing campaigns. Our platform serves over
                  10,000 businesses worldwide, helping them achieve remarkable
                  growth through WhatsApp marketing.
                </p>
                <p>
                  Founded in 2023 by former Meta engineers, WPSaaS democratizes
                  WhatsApp marketing by providing enterprise-level features at
                  affordable prices. Our mission is to empower every business
                  with the tools they need to build meaningful relationships
                  with their customers through WhatsApp.
                </p>
                <p>
                  The platform offers comprehensive features including bulk
                  messaging, automation workflows, advanced analytics, chatbot
                  integration, and seamless API connections. With a focus on
                  compliance and user experience, WPSaaS has become the trusted
                  choice for businesses looking to scale their WhatsApp
                  marketing efforts.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Company Facts
              </h3>
              <div className="grid grid-cols-2 gap-6">
                {Object.entries(companyInfo).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {value}
                    </div>
                    <div className="text-gray-600 text-sm capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Statistics */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Key Statistics
            </h2>
            <p className="text-xl text-gray-600">
              Numbers that showcase our impact
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {keyStats.map((stat, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-lg text-center"
              >
                <div className="bg-green-100 p-3 rounded-lg w-fit mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Assets */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Media Assets
            </h2>
            <p className="text-xl text-gray-600">
              Download high-quality assets for your stories
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {assets.map((category, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <category.icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {category.category}
                  </h3>
                </div>

                <div className="space-y-4">
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between bg-white p-4 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.format} • {item.size}
                        </div>
                      </div>
                      <button className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors">
                  Download All {category.category}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Executive Team */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Executive Team
            </h2>
            <p className="text-xl text-gray-600">
              Meet the leaders behind WPSaaS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {executiveTeam.map((exec, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-lg text-center"
              >
                <img
                  src={exec.image}
                  alt={exec.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {exec.name}
                </h3>
                <p className="text-green-600 font-medium mb-4">{exec.role}</p>
                <p className="text-gray-600 text-sm">{exec.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent News */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Recent News
            </h2>
            <p className="text-xl text-gray-600">
              Latest coverage and announcements
            </p>
          </div>

          <div className="space-y-6">
            {recentNews.map((news, index) => (
              <div
                key={index}
                className="bg-gray-50 p-6 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-2">
                      {news.date} • {news.publication}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {news.title}
                    </h3>
                  </div>
                  <button className="mt-4 md:mt-0 md:ml-6 text-green-600 hover:text-green-700 font-medium">
                    Read Article →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Media Inquiries
          </h2>
          <p className="text-xl text-white/90 mb-8">
            For press inquiries, interviews, or additional information, please
            contact our media team.
          </p>

          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
              <div>
                <h3 className="font-bold mb-2">Press Contact</h3>
                <p>Sarah Martinez</p>
                <p>Head of Communications</p>
                <p>press@wpsaas.com</p>
                <p>+1 (555) 123-4567</p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Business Inquiries</h3>
                <p>Michael Thompson</p>
                <p>VP of Business Development</p>
                <p>business@wpsaas.com</p>
                <p>+1 (555) 123-4568</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PressKit;
