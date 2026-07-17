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

import { useState } from "react";
import {
  Search,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  Archive,
  Star,
  Trash2,
  CheckCheck,
  ArrowLeft,
  X,
  MessageCircle,
} from "lucide-react";

const ChatHub = () => {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);

  const chats = [
    {
      id: 1,
      name: "John Smith",
      phone: "+1 234-567-8901",
      lastMessage: "Thank you for the quick response!",
      timestamp: "2 min ago",
      unread: 2,
      status: "online",
      avatar:
        "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
      tags: ["customer", "vip"],
    },
    {
      id: 2,
      name: "Sarah Johnson",
      phone: "+1 234-567-8902",
      lastMessage: "Can you send me the product catalog?",
      timestamp: "15 min ago",
      unread: 0,
      status: "away",
      avatar:
        "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
      tags: ["lead"],
    },
    {
      id: 3,
      name: "Mike Wilson",
      phone: "+1 234-567-8903",
      lastMessage: "When will my order be delivered?",
      timestamp: "1 hour ago",
      unread: 1,
      status: "offline",
      avatar:
        "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
      tags: ["customer"],
    },
    {
      id: 3,
      name: "Mike Wilson",
      phone: "+1 234-567-8903",
      lastMessage: "When will my order be delivered?",
      timestamp: "1 hour ago",
      unread: 1,
      status: "offline",
      avatar:
        "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
      tags: ["customer"],
    },
    {
      id: 3,
      name: "Mike Wilson",
      phone: "+1 234-567-8903",
      lastMessage: "When will my order be delivered?",
      timestamp: "1 hour ago",
      unread: 1,
      status: "offline",
      avatar:
        "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
      tags: ["customer"],
    },
    {
      id: 4,
      name: "Mike Wilson",
      phone: "+1 234-567-8903",
      lastMessage: "When will my order be delivered?",
      timestamp: "1 hour ago",
      unread: 1,
      status: "offline",
      avatar:
        "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
      tags: ["customer"],
    },
  ];

  const messages = [
    {
      id: 5,
      sender: "customer",
      content: "Hi, I need help with my recent order",
      timestamp: "10:30 AM",
      status: "read",
    },
    {
      id: 6,
      sender: "agent",
      content:
        "Hello! I'd be happy to help you with your order. Can you please provide your order number?",
      timestamp: "10:32 AM",
      status: "delivered",
    },
    {
      id: 7,
      sender: "customer",
      content: "Sure, it's #ORD-12345",
      timestamp: "10:33 AM",
      status: "read",
    },
    {
      id: 8,
      sender: "agent",
      content:
        "Thank you! I can see your order here. It's currently being processed and will be shipped within 24 hours.",
      timestamp: "10:35 AM",
      status: "delivered",
    },
    {
      id: 9,
      sender: "customer",
      content: "Thank you for the quick response!",
      timestamp: "10:36 AM",
      status: "read",
    },
  ];

  const cannedResponses = [
    "Thank you for contacting us!",
    "I'll help you with that right away.",
    "Can you please provide more details?",
    "Your order is being processed.",
    "Is there anything else I can help you with?",
  ];

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessage("");
    }
  };

  const handleSelectChat = (chatId: number) => {
    setSelectedChat(chatId);
    setShowContactInfo(false);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setShowContactInfo(false);
  };

  const selectedChatData = chats.find((c) => c.id === selectedChat);

  return (
    <div className="h-full w-full bg-gray-50 p-4 sm:p-6">
      {/* Main Container - Full height with proper constraints */}
      <div className="flex h-full max-h-[calc(100vh-120px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Left Sidebar - Chat List */}
        <div
          className={`${
            selectedChat ? "hidden md:flex" : "flex"
          } w-full md:w-80 lg:w-96 border-r border-gray-200 flex-col bg-white`}
        >
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">
              Chat Hub
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Chat List - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`p-3 sm:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedChat === chat.id
                    ? "bg-green-50 md:border-r-4 md:border-green-500"
                    : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white ${
                        chat.status === "online"
                          ? "bg-green-500"
                          : chat.status === "away"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                        {chat.name}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {chat.timestamp}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {chat.lastMessage}
                    </p>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <div className="flex flex-wrap gap-1">
                        {chat.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {chat.unread > 0 && (
                        <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div
          className={`${
            selectedChat ? "flex" : "hidden md:flex"
          } flex-1 flex-col bg-white min-w-0`}
        >
          {selectedChat && selectedChatData ? (
            <>
              {/* Chat Header - Fixed */}
              <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
                <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Clickable Avatar and Name */}
                  <div
                    onClick={() => setShowContactInfo(true)}
                    className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0 cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors"
                  >
                    <img
                      src={selectedChatData.avatar}
                      alt="User"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                        {selectedChatData.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {selectedChatData.phone}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button className="hidden sm:block p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button className="hidden sm:block p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Messages - Scrollable area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gray-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === "agent" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-xs md:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                        msg.sender === "agent"
                          ? "bg-green-500 text-white"
                          : "bg-white border border-gray-200 shadow-sm"
                      }`}
                    >
                      <p className="text-xs sm:text-sm break-words leading-relaxed">
                        {msg.content}
                      </p>
                      <div
                        className={`flex items-center justify-between mt-1 gap-2 ${
                          msg.sender === "agent"
                            ? "text-green-100"
                            : "text-gray-500"
                        }`}
                      >
                        <span className="text-xs">{msg.timestamp}</span>
                        {msg.sender === "agent" && (
                          <CheckCheck
                            className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                              msg.status === "read"
                                ? "text-blue-200"
                                : "text-green-200"
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Canned Responses - Fixed */}
              <div className="bg-white p-2 sm:p-3 border-t border-gray-200 flex-shrink-0">
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                  {cannedResponses.map((response, index) => (
                    <button
                      key={index}
                      onClick={() => setMessage(response)}
                      className="bg-gray-100 hover:bg-gray-200 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm text-gray-700 whitespace-nowrap border border-gray-300 flex-shrink-0 transition-colors"
                    >
                      {response}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input - Fixed */}
              <div className="bg-white p-2 sm:p-3 md:p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <button className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex-shrink-0">
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      placeholder="Type a message..."
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <button className="hidden sm:block p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex-shrink-0">
                    <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="bg-green-500 text-white p-1.5 sm:p-2.5 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="text-center p-4">
                <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  No Chat Selected
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  Select a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Info Slide-in Panel */}
      {showContactInfo && selectedChatData && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowContactInfo(false)}
          />

          <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Contact Info</h3>
              <button
                onClick={() => setShowContactInfo(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="text-center mb-6">
                <img
                  src={selectedChatData.avatar}
                  alt="Contact"
                  className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                />
                <h3 className="font-semibold text-gray-900 text-lg">
                  {selectedChatData.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedChatData.phone}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 flex items-center justify-center transition-colors">
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </button>
                  <button className="bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <Video className="w-4 h-4 mr-2" />
                    Video
                  </button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Quick Actions
                  </h4>
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center transition-colors">
                      <Star className="w-5 h-5 mr-3 text-yellow-500" />
                      Add to Favorites
                    </button>
                    <button className="w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center transition-colors">
                      <Archive className="w-5 h-5 mr-3 text-gray-500" />
                      Archive Chat
                    </button>
                    <button className="w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center text-red-600 transition-colors">
                      <Trash2 className="w-5 h-5 mr-3" />
                      Delete Chat
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Contact Info
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-500 text-sm">Status:</span>
                      <span className="ml-2 capitalize text-sm">
                        {selectedChatData.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedChatData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatHub;
