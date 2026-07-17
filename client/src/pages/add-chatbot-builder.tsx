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

import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  Upload,
  Palette,
  Bot,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

const AVATAR_OPTIONS = [
  { id: 1, emoji: "🤖", color: "#3B82F6" },
  { id: 2, emoji: "💬", color: "#10B981" },
  { id: 3, emoji: "🎯", color: "#8B5CF6" },
  { id: 4, emoji: "⚡", color: "#F59E0B" },
  { id: 5, emoji: "🌟", color: "#EC4899" },
  { id: 6, emoji: "🚀", color: "#06B6D4" },
];

const COLOR_OPTIONS = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#EF4444",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
  "#A855F7",
];

const AddChatbotBuilder = () => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    title: "MagicAIBots",
    bubbleMessage: "Hey there, How can I help you?",
    welcomeMessage: "Hi, how can I help you?",
    instructions: "",
    connectMessage:
      "I've forwarded your request to a human agent. An agent will connect with you as soon as possible.",
    language: "en",
    interactionType: "ai-only",
    avatar: AVATAR_OPTIONS[0],
    primaryColor: "#3B82F6",
    logoUrl: null,
  });

  const { t } = useTranslation();
  const [chatbotId, setChatbotId] = useState(null);
  const [trainingData, setTrainingData] = useState([]);
  const [embedCode, setEmbedCode] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: config.welcomeMessage, time: "1 hour ago" },
    {
      id: 2,
      type: "user",
      text: "I need to make a refund.",
      time: "58 minutes ago",
    },
    {
      id: 3,
      type: "bot",
      text: "A refund will be provided after we process your return item at our facilities. It may take additional time for your financial institution to process the refund.",
      time: "56 minutes ago",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    generateEmbedCode();
  }, [config]);

  const generateEmbedCode = () => {
    const code = `<script defer
  src="${window.location}/vendor/chatbot/js/external-chatbot.js"
  data-chatbot-uuid="${Math.random().toString(36).substr(2, 9)}"
  data-iframe-width="420"
  data-iframe-height="745"
  data-language="en">
</script>`;
    setEmbedCode(code);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setConfig({ ...config, logoUrl: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title ?? "";

  const handleSaveChatbot = async () => {
    try {
      const res = chatbotId
        ? await api.updateChatbot(chatbotId, config)
        : await api.createChatbot(config);
      if (!chatbotId) setChatbotId(res.data.id);
      alert("Chatbot saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving chatbot.");
    }
  };

  // ✅ Add training data
  const addTrainingText = async (title, text) => {
    if (!chatbotId) return alert("Save chatbot first!");
    try {
      const res = await api.addTrainingData({ chatbotId, title, text });
      setTrainingData([...trainingData, res.data]);
      alert("Training data added!");
    } catch (err) {
      console.error(err);
      alert("Error adding training data.");
    }
  };

  // ✅ Send message
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setMessages([
      ...messages,
      { id: Date.now(), type: "user", text: inputMessage },
    ]);
    setInputMessage("");
    try {
      const res = await api.sendMessage({
        chatbotId,
        message: inputMessage,
        sender: "user",
      });
      if (res.data.reply) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), type: "bot", text: res.data.reply },
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitBot = async () => {
    try {
      if (!chatbotId) {
        const res = await api.createChatbot(config);
        setChatbotId(res.data.id);
      }

      // Send training data if any
      for (const t of trainingData) {
        await api.addTrainingData({ chatbotId, ...t });
      }

      alert("✅ Chatbot submitted successfully!");
      generateEmbedCode(); // regenerate with chatbot UUID
    } catch (error) {
      console.error(error);
      alert("❌ Failed to submit chatbot");
    }
  };

  const ChatPreview = () => (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Chat Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ backgroundColor: config.primaryColor }}
        >
          <button className="text-white">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-full bg-white p-1"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: config.avatar.color }}
              >
                {config.avatar.emoji}
              </div>
            )}
            <span className="font-semibold text-white">{config.title}</span>
          </div>
          <div className="w-6"></div>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex flex-col max-w-xs">
                {msg.type === "bot" && (
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: config.avatar.color }}
                    >
                      {config.avatar.emoji}
                    </div>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.type === "user"
                      ? "rounded-tr-none text-white"
                      : "rounded-tl-none bg-white border border-gray-200 text-gray-800"
                  }`}
                  style={
                    msg.type === "user"
                      ? { backgroundColor: config.primaryColor }
                      : {}
                  }
                >
                  {msg.text}
                </div>
                <span className="text-xs text-gray-400 mt-1 px-2">
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <input
              type="text"
              placeholder="Message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <button className="text-gray-400">📎</button>
            <button className="text-gray-400">😊</button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-3 bg-white text-center">
          <span className="text-xs text-gray-400">
            Powered by <span className="text-blue-600">{appName}</span>
          </span>
        </div>
      </div>

      {/* Floating Button */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white"
        style={{ backgroundColor: config.primaryColor }}
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header title={t("chatbot.title")} subtitle={t("chatbot.subtitle")} />

      <main className="p-6 space-y-6">
        <div className="flex h-screen bg-white">
          {/* Left Panel */}
          <div className="w-96 border-r border-gray-200 overflow-y-auto">
            {/* Steps Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              {[
                { num: 1, label: "Configure", icon: "⚙️" },
                { num: 2, label: "Customize", icon: "🎨" },
                { num: 3, label: "Train", icon: "📚" },
                { num: 4, label: "Embed", icon: "💻" },
              ].map((s) => (
                <div key={s.num} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step >= s.num
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {step > s.num ? <Check size={16} /> : s.num}
                  </div>
                  <span className="text-xs mt-1 text-gray-600">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Step 1: Configure */}
            {step === 1 && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Configure
                  </h2>
                  <p className="text-sm text-gray-500">
                    Create and configure a chatbot that interacts with your
                    users, ensuring it delivers accurate information.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chatbot Title
                  </label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) =>
                      setConfig({ ...config, title: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bubble Message
                  </label>
                  <input
                    type="text"
                    value={config.bubbleMessage}
                    onChange={(e) =>
                      setConfig({ ...config, bubbleMessage: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message
                  </label>
                  <input
                    type="text"
                    value={config.welcomeMessage}
                    onChange={(e) =>
                      setConfig({ ...config, welcomeMessage: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chatbot Instructions
                  </label>
                  <textarea
                    value={config.instructions}
                    onChange={(e) =>
                      setConfig({ ...config, instructions: e.target.value })
                    }
                    placeholder="Explain chatbot role"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) =>
                      setConfig({ ...config, language: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interaction Type
                  </label>
                  <select
                    value={config.interactionType}
                    onChange={(e) =>
                      setConfig({ ...config, interactionType: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ai-only">Only AI</option>
                    <option value="human-only">Only Human</option>
                    <option value="hybrid">AI + Human</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connect Message
                  </label>
                  <textarea
                    value={config.connectMessage}
                    onChange={(e) =>
                      setConfig({ ...config, connectMessage: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Next
                </button>
              </div>
            )}

            {/* Step 2: Customize */}
            {step === 2 && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Customize
                  </h2>
                  <p className="text-sm text-gray-500">
                    Personalize your chatbot's appearance to match your brand.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Upload Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors">
                        {config.logoUrl ? (
                          <img
                            src={config.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Upload className="text-gray-400" size={24} />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {config.logoUrl && (
                      <button
                        onClick={() => setConfig({ ...config, logoUrl: null })}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Avatar
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setConfig({ ...config, avatar })}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${
                          config.avatar.id === avatar.id
                            ? "ring-4 ring-blue-500 scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: avatar.color }}
                      >
                        {avatar.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Primary Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setConfig({ ...config, primaryColor: color })
                        }
                        className={`w-12 h-12 rounded-lg transition-all ${
                          config.primaryColor === color
                            ? "ring-4 ring-offset-2 ring-gray-400 scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {config.primaryColor === color && (
                          <Check className="text-white mx-auto" size={20} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Train */}
            {step === 3 && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Chatbot Training
                  </h2>
                  <p className="text-sm text-gray-500">
                    This step is optional but highly recommended to personalize
                    your chatbot experience.
                  </p>
                </div>

                <div className="flex gap-2 mb-4">
                  {["Website", "PDF", "Text", "Q&A"].map((tab) => (
                    <button
                      key={tab}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <span className="font-semibold text-gray-900">
                      Add Text
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        id="training-title"
                        placeholder="Type your title here"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Text
                      </label>
                      <textarea
                        id="training-text"
                        placeholder="Type your text here"
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const title =
                      document.getElementById("training-title").value;
                    const text = document.getElementById("training-text").value;
                    addTrainingText(title, text);
                  }}
                  className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  + Add
                </button>

                {trainingData.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">
                      Added Training Data
                    </h3>
                    {trainingData.map((data) => (
                      <div key={data.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm">{data.title}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Embed */}
            {step === 4 && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Test and Embed
                  </h2>
                  <p className="text-sm text-gray-500">
                    Your external AI chatbot has been successfully created! You
                    can now integrate it into your website and start engaging
                    with your audience.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Embed Code
                  </label>
                  <div className="relative">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                      <code>{embedCode}</code>
                    </pre>
                    <button
                      onClick={() => navigator.clipboard.writeText(embedCode)}
                      className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width
                  </label>
                  <input
                    type="range"
                    min="300"
                    max="600"
                    defaultValue="420"
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">420px</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height
                  </label>
                  <input
                    type="range"
                    min="400"
                    max="900"
                    defaultValue="745"
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">745px</span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Need help?
                  </h3>
                  <p className="text-sm text-blue-800">
                    Paste this code just before the closing &lt;/body&gt; tag in
                    your HTML file, then save the changes. Refresh your site to
                    ensure your chatbot works correctly.
                  </p>
                </div>

                <button
                  onClick={handleSubmitBot}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold mt-4"
                >
                  Submit & Deploy Chatbot
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <ChatPreview />
        </div>
      </main>
    </div>
  );
};

export default AddChatbotBuilder;
