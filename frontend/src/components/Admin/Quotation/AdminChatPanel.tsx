import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../../services/api';
import {
  Send, Building2, MapPin, DollarSign, Phone, Mail, User, CheckCheck, Check,
  ArrowLeft, MoreVertical, RefreshCw, Tag, Paperclip, Image as ImageIcon,
  FileText, File as FileIcon, Download, X,
} from 'lucide-react';

interface ClientSummary {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  address?: string;
}

interface Thread {
  id: string;
  client_id: string;
  service_name: string;
  company_name?: string;
  client_address?: string;
  location_notes?: string;
  budget_estimate?: number | string;
  requirements: string;
  status: string;
  created_at: string;
  last_message_at?: string;
  client_unread: number;
  admin_unread: number;
  client?: ClientSummary;
}

interface ChatMessage {
  id: string;
  sender_type: 'client' | 'admin' | 'system';
  sender_name?: string;
  content: string;
  message_type: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  read_at?: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pendiente',   color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { value: 'active',      label: 'En Proceso',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'quoted',      label: 'Cotizado',    color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { value: 'negotiating', label: 'Negociando',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'closed',      label: 'Cerrado',     color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
  { value: 'cancelled',   label: 'Cancelado',   color: 'text-red-400 bg-red-500/10 border-red-500/20' },
];

function formatRelative(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.max(1, Math.round(diffMs / 1000));
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}

function clientDisplayName(c?: ClientSummary): string {
  if (!c) return 'Cliente';
  const composed = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return composed || c.full_name || c.email || 'Cliente';
}

interface Props {
  threadId: string;
  onBack: () => void;
  onStatusChange?: () => void;
}

export default function AdminChatPanel({ threadId, onBack, onStatusChange }: Props) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadThread = useCallback(async () => {
    try {
      const res = await api.get(`/chat-quotations/admin/threads/${threadId}`);
      setThread(res.data);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error('Error cargando hilo:', e);
    }
  }, [threadId]);

  useEffect(() => {
    loadThread();
    const interval = setInterval(loadThread, 8000);
    return () => clearInterval(interval);
  }, [loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() && !previewFile) return;
    try {
      await api.post(`/chat-quotations/admin/threads/${threadId}/messages`, {
        content: newMessage.trim() || (previewFile ? `Adjunto: ${previewFile.name}` : ''),
        message_type: previewFile ? (previewFile.type.startsWith('image/') ? 'image' : 'file') : 'text',
        attachment_url: previewFile?.url || null,
        attachment_name: previewFile?.name || null,
        attachment_type: previewFile?.type || null,
      });
      setNewMessage('');
      setPreviewFile(null);
      loadThread();
    } catch (e) {
      console.error(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const changeStatus = async (newStatus: string) => {
    try {
      await api.patch(`/chat-quotations/admin/threads/${threadId}/status`, { new_status: newStatus });
      setShowStatusMenu(false);
      loadThread();
      onStatusChange?.();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(
        `/chat-quotations/admin/threads/${threadId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setPreviewFile({ url: res.data.url, name: res.data.name, type: res.data.type });
    } catch (e) {
      console.error(e);
      alert('Error al subir archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <FileIcon className="w-8 h-8 text-blue-400" />;
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-purple-400" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
    return <FileIcon className="w-8 h-8 text-blue-400" />;
  };

  if (!thread) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Cargando...</div>;
  }
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === thread.status);
  const displayName = clientDisplayName(thread.client);

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      {/* Sidebar de cliente */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900 p-5 overflow-y-auto hidden xl:block">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-1">{thread.service_name}</h3>
          <p className="text-xs text-slate-500 font-mono">ID: {thread.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div className="mb-6 relative">
          <button
            type="button"
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium ${currentStatus?.color}`}
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {currentStatus?.label || thread.status}
            </span>
            <MoreVertical className="w-4 h-4" />
          </button>
          {showStatusMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => changeStatus(opt.value)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 text-slate-300 flex items-center gap-2"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-slate-300">
            <User className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Cliente</p>
              <p className="text-sm font-medium">{displayName}</p>
            </div>
          </div>
          {(thread.client?.company_name || thread.company_name) && (
            <div className="flex items-center gap-3 text-slate-300">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Empresa</p>
                <p className="text-sm">{thread.client?.company_name || thread.company_name}</p>
              </div>
            </div>
          )}
          {thread.client?.email && (
            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm break-all">{thread.client.email}</p>
              </div>
            </div>
          )}
          {thread.client?.phone && (
            <div className="flex items-center gap-3 text-slate-300">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Teléfono</p>
                <p className="text-sm">{thread.client.phone}</p>
              </div>
            </div>
          )}
          {(thread.client_address || thread.location_notes || thread.client?.address) && (
            <div className="flex items-start gap-3 text-slate-300">
              <MapPin className="w-4 h-4 mt-1 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Ubicación</p>
                <p className="text-sm">
                  {thread.location_notes || thread.client_address || thread.client?.address}
                </p>
              </div>
            </div>
          )}
          {thread.budget_estimate != null && (
            <div className="flex items-center gap-3 text-emerald-400">
              <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs text-emerald-600">Presupuesto Cliente</p>
                <p className="text-lg font-bold">
                  ${Number(thread.budget_estimate).toLocaleString('es-VE')}
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 uppercase mb-2">Requerimiento Original</p>
            <p className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
              {thread.requirements}
            </p>
          </div>
        </div>
      </aside>

      {/* Columna de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-slate-800 p-4 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={onBack} className="text-slate-400 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h3 className="text-white font-medium truncate">{displayName}</h3>
              <p className="text-xs text-slate-500 truncate">
                {thread.service_name} · {thread.client?.company_name || thread.company_name || 'Sin empresa'}
              </p>
            </div>
          </div>
          <div className={`xl:hidden px-3 py-1 rounded-full text-xs border ${currentStatus?.color}`}>
            {currentStatus?.label || thread.status}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => {
            const isAdmin = msg.sender_type === 'admin';
            const isSystem = msg.sender_type === 'system';
            const showHeader = idx === 0 || messages[idx - 1].sender_type !== msg.sender_type;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg px-4 py-2 text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" />
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] sm:max-w-[75%] ${isAdmin ? 'order-2' : 'order-1'}`}>
                  {showHeader && !isAdmin && (
                    <p className="text-xs text-slate-500 mb-1">{msg.sender_name || displayName}</p>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    isAdmin
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-slate-800 text-slate-200 rounded-bl-md border border-slate-700'
                  }`}>
                    {msg.content && msg.message_type !== 'image' && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.attachment_url && msg.message_type === 'image' && (
                      <div className="mt-2">
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={msg.attachment_url}
                            alt={msg.attachment_name || 'Imagen'}
                            className="max-w-full rounded-lg hover:opacity-90 transition-opacity max-h-64 object-cover"
                          />
                        </a>
                        {msg.attachment_name && <p className="text-[10px] mt-1 opacity-70">{msg.attachment_name}</p>}
                      </div>
                    )}
                    {msg.attachment_url && msg.message_type === 'file' && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 mt-2 bg-slate-900/50 p-3 rounded-lg hover:bg-slate-900/80 transition-colors"
                      >
                        {getFileIcon(msg.attachment_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{msg.attachment_name}</p>
                          <p className="text-[10px] opacity-60">Click para descargar</p>
                        </div>
                        <Download className="w-4 h-4 opacity-60" />
                      </a>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-slate-600">{formatRelative(msg.created_at)}</span>
                    {isAdmin && (msg.read_at ? <CheckCheck className="w-3 h-3 text-blue-300" /> : <Check className="w-3 h-3 text-blue-300/50" />)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-800 p-4 bg-slate-900/80">
          {previewFile && (
            <div className="mb-3 bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-3 max-w-4xl mx-auto">
              {previewFile.type.startsWith('image/') ? (
                <img src={previewFile.url} alt="preview" className="w-10 h-10 rounded object-cover" />
              ) : (
                getFileIcon(previewFile.type)
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 truncate">{previewFile.name}</p>
                <p className="text-[10px] text-slate-500">Listo para enviar</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2.5 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 disabled:opacity-50"
              title="Adjuntar archivo"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Responder al cliente..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none max-h-32 min-h-[44px]"
              rows={1}
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !previewFile) || uploading}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
