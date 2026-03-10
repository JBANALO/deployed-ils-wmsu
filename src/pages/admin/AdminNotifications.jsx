import React, { useEffect, useState, useMemo } from "react";
import { ChatBubbleBottomCenterIcon, EnvelopeIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";
import { toast } from "react-toastify";

const getMessageTimestamp = (msg = {}) => {
  const candidates = [
    msg.created_at,
    msg.createdAt,
    msg.updated_at,
    msg.updatedAt,
    msg.timestamp,
    msg.date
  ].filter(Boolean);

  for (const value of candidates) {
    if (typeof value === 'string' && value.includes(' ') && !value.includes('T')) {
      const parsed = new Date(value.replace(' ', 'T'));
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

const formatMessageTimestamp = (msg) => {
  const date = getMessageTimestamp(msg);
  if (!date) return 'Unknown date';
  return date.toLocaleString();
};

export default function AdminNotifications() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unread");

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/support", { params: { limit: 100 } });
      const records = response.data?.data?.messages || [];
      const normalized = records.map((msg) => ({
        ...msg,
        is_read: typeof msg.is_read !== 'undefined' ? msg.is_read : (msg.isRead ? 1 : 0)
      }));
      setMessages(normalized);
    } catch (error) {
      console.error("Failed to load support messages", error);
      toast.error("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/support/${id}`, { isRead: true });
      setMessages((prev) => prev.map((msg) => (
        msg.id === id ? { ...msg, is_read: 1, isRead: true } : msg
      )));
      toast.success("Marked as read.");
    } catch (error) {
      console.error("Failed to mark as read", error);
      toast.error("Unable to mark message as read.");
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const isUnread = (msg) => Number(msg?.is_read) !== 1;
  const isRead = (msg) => Number(msg?.is_read) === 1;

  const filteredMessages = useMemo(() => {
    if (filter === "unread") return messages.filter(isUnread);
    if (filter === "read") return messages.filter(isRead);
    return messages;
  }, [messages, filter]);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">All customer service messages sent by teachers.</p>
        </div>
        <div className="flex items-center gap-2">
          {['unread', 'read', 'all'].map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                filter === option
                  ? 'bg-red-700 text-white border-red-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading notifications...</div>
      ) : filteredMessages.length === 0 ? (
        <div className="py-16 text-center text-gray-500">No notifications to display.</div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`border rounded-lg p-4 transition-colors ${
                msg.is_read ? 'bg-gray-50 border-gray-200' : 'bg-red-50/40 border-red-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ChatBubbleBottomCenterIcon className="w-6 h-6 text-red-700" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {msg.name || 'Teacher'} ({msg.email})
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatMessageTimestamp(msg)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isUnread(msg) && (
                    <button
                      onClick={() => markAsRead(msg.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full hover:bg-green-200"
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.email)}
                    className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                  >
                    <EnvelopeIcon className="w-4 h-4" /> Copy Email
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{msg.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
