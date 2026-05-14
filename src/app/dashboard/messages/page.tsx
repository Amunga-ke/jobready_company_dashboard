"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  MessageSquare,
  Send,
  Search,
  User,
  Clock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  listingId: string | null;
  listingTitle: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  body: string;
  senderType: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  recipientType: string;
  isRead: boolean;
  listingId: string | null;
  listingTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex gap-3 max-w-[75%]">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-16 w-64 rounded-2xl" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [showMobileConversation, setShowMobileConversation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "50");
      const res = await fetch(`/api/employer/messages?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setConversations(json.conversations || []);
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [searchQuery]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (userId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/employer/messages/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setMessages(json.messages || []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedUserId || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/employer/messages/${selectedUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: messageInput.trim(),
          listingId: selectedConversation?.listingId || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to send");

      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput("");
      textareaRef.current?.focus();

      // Update conversation list (last message changes)
      fetchConversations();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Select conversation
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedUserId(conv.userId);
    setSelectedConversation(conv);
    setShowMobileConversation(true);
    fetchMessages(conv.userId);
  };

  // Handle keyboard shortcut for sending
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Back to conversation list on mobile
  const handleBackToList = () => {
    setShowMobileConversation(false);
    setSelectedUserId(null);
    setSelectedConversation(null);
    setMessages([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Communicate with applicants about their applications.
        </p>
      </div>

      <Card className="overflow-hidden border-gray-200">
        <div className="flex h-[calc(100vh-13rem)] min-h-[500px]">
          {/* Left Panel - Conversation List */}
          <div
            className={`w-full md:w-[360px] lg:w-[400px] border-r border-gray-200 flex flex-col shrink-0 ${
              showMobileConversation ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm"
                />
              </div>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="space-y-0">
                  {[...Array(6)].map((_, i) => (
                    <ConversationSkeleton key={i} />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    No conversations yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Messages from applicants will appear here when they reach
                    out to you.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${
                      selectedUserId === conv.userId ? "bg-violet-50" : ""
                    }`}
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage
                        src={conv.userAvatar || undefined}
                        alt={conv.userName}
                      />
                      <AvatarFallback className="bg-violet-100 text-violet-700 text-sm">
                        {getInitials(conv.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-semibold truncate ${
                            conv.unreadCount > 0
                              ? "text-gray-900"
                              : "text-gray-700"
                          }`}
                        >
                          {conv.userName}
                        </span>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), {
                            addSuffix: false,
                          })}
                        </span>
                      </div>
                      {conv.listingTitle && (
                        <p className="text-[11px] text-violet-500 font-medium truncate mt-0.5">
                          {conv.listingTitle}
                        </p>
                      )}
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          conv.unreadCount > 0
                            ? "text-gray-700 font-medium"
                            : "text-gray-400"
                        }`}
                      >
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 hidden lg:block" />
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Active Conversation */}
          <div
            className={`flex-1 flex flex-col min-w-0 ${
              !showMobileConversation ? "hidden md:flex" : "flex"
            }`}
          >
            {!selectedConversation ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <MessageSquare className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600">
                  Select a conversation
                </h3>
                <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">
                  Choose a conversation from the list to start messaging an
                  applicant.
                </p>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
                  {/* Mobile back button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 -ml-1"
                    onClick={handleBackToList}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage
                      src={selectedConversation.userAvatar || undefined}
                      alt={selectedConversation.userName}
                    />
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-sm">
                      {getInitials(selectedConversation.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {selectedConversation.userName}
                    </h3>
                    {selectedConversation.listingTitle && (
                      <p className="text-xs text-gray-500 truncate">
                        Re: {selectedConversation.listingTitle}
                      </p>
                    )}
                  </div>
                  {selectedConversation.listingTitle && (
                    <Badge
                      variant="outline"
                      className="hidden sm:flex text-violet-600 border-violet-200 bg-violet-50 text-[11px] shrink-0"
                    >
                      {selectedConversation.listingTitle}
                    </Badge>
                  )}
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {loadingMessages ? (
                      <div className="space-y-6">
                        <MessageSkeleton />
                        <div className="flex gap-3 max-w-[75%] ml-auto">
                          <div className="space-y-2 flex flex-col items-end">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-20 w-56 rounded-2xl" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        </div>
                        <MessageSkeleton />
                        <MessageSkeleton />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Clock className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">
                          No messages yet. Say hello!
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isFromCompany = msg.senderType === "COMPANY";
                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-2.5 ${
                              isFromCompany
                                ? "flex-row-reverse ml-auto"
                                : "mr-auto"
                            }`}
                            style={{ maxWidth: "75%" }}
                          >
                            <Avatar className="h-8 w-8 shrink-0 mt-1">
                              <AvatarImage
                                src={msg.senderAvatar || undefined}
                                alt={msg.senderName}
                              />
                              <AvatarFallback
                                className={`text-[11px] ${
                                  isFromCompany
                                    ? "bg-violet-600 text-white"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {getInitials(msg.senderName)}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`flex flex-col ${
                                isFromCompany ? "items-end" : "items-start"
                              }`}
                            >
                              <span className="text-[11px] text-gray-400 mb-1 px-1">
                                {msg.senderName}
                              </span>
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                  isFromCompany
                                    ? "bg-violet-600 text-white rounded-br-md"
                                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                                }`}
                              >
                                {msg.body}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 px-1">
                                <span className="text-[10px] text-gray-400">
                                  {formatDistanceToNow(new Date(msg.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                                {isFromCompany && (
                                  <span className="text-[10px] text-gray-400">
                                    {msg.isRead ? "✓✓" : "✓"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 border-t border-gray-200 bg-white shrink-0">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="resize-none min-h-[44px] max-h-[120px] py-3 px-4 pr-12 text-sm rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus-visible:ring-violet-500"
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "44px";
                          target.style.height = `${Math.min(
                            target.scrollHeight,
                            120
                          )}px`;
                        }}
                      />
                    </div>
                    <Button
                      onClick={sendMessage}
                      disabled={!messageInput.trim() || sending}
                      className="h-11 w-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shrink-0 p-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
