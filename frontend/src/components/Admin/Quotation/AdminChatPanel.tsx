import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../../services/api';
import { useWebSocket } from '../../../context/WebSocketContext';
import {
  Send, Building2, MapPin, DollarSign, Phone, Mail, User, CheckCheck, Check,
  ArrowLeft, MoreVertical, RefreshCw, Tag, Paperclip, Image as ImageIcon,
  FileText, File as FileIcon, Download, X, Receipt, Zap,
} from 'lucide-react';
import InvoiceSelectorModal from '../../Client/Quotations/InvoiceSelectorModal';
import InvoiceMentionBubble, { InvoiceBriefData } from '../../Client/Quotations/InvoiceMentionBubble';

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
  invoices?: InvoiceBriefData[];
}

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pendiente',   color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { value: 'active',      label: 'En Proceso',  color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'quoted',      label: 'Cotizado',    color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'negotiating', label: 'Negociando',  color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { value: 'closed',      label: 'Cerrado',     color: 'text-gray-700 bg-gray-50 border-gray-200' },
  { value: 'cancelled',   label: 'Cancelado',   color: 'text-red-700 bg-red-50 border-red-200' },
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
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [invoicePickerOpen, setInvoicePickerOpen] = useState(false);
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

  // SC-WS-01: carga inicial + suscripción WebSocket (sin polling)
  const { subscribe, subscribeThread, unsubscribeThread } = useWebSocket();

  useEffect(() => {
    loadThread();
    subscribeThread(threadId);
    return () => unsubscribeThread(threadId);
  }, [loadThread, threadId, subscribeThread, unsubscribeThread]);

  useEffect(() => {
    const unsub = subscribe('chat_message', (event) => {
      const msg = event.payload;
      if (!msg || msg.thread_id !== threadId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [subscribe, threadId]);

  useEffect(() => {
    const unsub = subscribe('thread_updated', (event) => {
      if (event.payload?.thread_id === threadId) loadThread();
    });
    return unsub;
  }, [subscribe, threadId, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (sending) return;
    if (!newMessage.trim() && !previewFile) return;

    const contentToSend = newMessage.trim();
    const fileToSend = previewFile;
    // Limpieza optimista
    setNewMessage('');
    setPreviewFile(null);
    setSending(true);

    try {
      const res = await api.post(`/chat-quotations/admin/threads/${threadId}/messages`, {
        content: contentToSend || (fileToSend ? `Adjunto: ${fileToSend.name}` : ''),
        message_type: fileToSend ? (fileToSend.type.startsWith('image/') ? 'image' : 'file') : 'text',
        attachment_url: fileToSend?.url || null,
        attachment_name: fileToSend?.name || null,
        attachment_type: fileToSend?.type || null,
      });
      setMessages((prev) => [...prev, res.data]);
    } catch (e) {
      console.error(e);
      setNewMessage(contentToSend);
      setPreviewFile(fileToSend);
      alert('Error al enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const sendInvoiceMention = async (invoiceIds: number[]) => {
    setInvoicePickerOpen(false);
    if (sending || invoiceIds.length === 0) return;
    setSending(true);
    try {
      const res = await api.post(`/chat-quotations/admin/threads/${threadId}/messages`, {
        content: newMessage.trim() || '',
        invoice_ids: invoiceIds,
      });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.detail || 'Error al adjuntar las facturas.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sending) sendMessage();
    }
  };

  const [automating, setAutomating] = useState(false);

  const automateThread = async () => {
    if (automating) return;
    setAutomating(true);
    try {
      await api.post(`/chat-quotations/admin/threads/${threadId}/automate`);
      alert('✅ Automatización enviada a ArtificialIC. La info viajará en segundo plano.');
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.detail || 'Error al automatizar.');
    } finally {
      setAutomating(false);
    }
  };

  const changeStatus = async (newStatus: string) => {
    if (changingStatus) return;
    setChangingStatus(true);
    try {
      await api.patch(`/chat-quotations/admin/threads/${threadId}/status`, { new_status: newStatus });
      setShowStatusMenu(false);
      await loadThread();
      onStatusChange?.();
    } catch (e) {
      console.error(e);
      alert('Error al cambiar estado.');
    } finally {
      setChangingStatus(false);
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
    if (!type) return <FileIcon className="w-8 h-8 text-cj-accent-blue" />;
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-purple-500" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    return <FileIcon className="w-8 h-8 text-cj-accent-blue" />;
  };

  if (!thread) {
    return <div className="flex items-center justify-center h-64 text-cj-text-secondary">Cargando...</div>;
  }
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === thread.status);
  const displayName = clientDisplayName(thread.client);

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-cj-bg-primary rounded-xl border border-cj-border shadow-cj-md overflow-hidden">
      {/* Sidebar de cliente */}
      <aside className="w-80 border-r border-cj-border bg-cj-bg-secondary p-5 overflow-y-auto hidden xl:block">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-cj-text-primary mb-1">{thread.service_name}</h3>
          <p className="text-xs text-cj-text-muted font-mono">ID: {thread.id.slice(0, 8).toUpperCase()}</p>
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
            <div className="absolute top-full left-0 right-0 mt-1 bg-cj-surface border border-cj-border rounded-lg shadow-cj-lg z-50 py-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => changeStatus(opt.value)}
                  disabled={changingStatus}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-cj-bg-secondary text-cj-text-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={automateThread}
            disabled={automating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-semibold shadow-cj-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Enviar contacto, mensajes y facturas a ArtificialIC"
          >
            <Zap className={`w-4 h-4 ${automating ? 'animate-pulse' : ''}`} />
            {automating ? 'Enviando...' : 'Automatizar'}
          </button>
          <p className="text-[10px] text-cj-text-muted mt-1.5 text-center">
            Sincroniza el thread completo a ArtificialIC
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-cj-text-secondary">
            <User className="w-4 h-4 text-cj-text-muted shrink-0" />
            <div>
              <p className="text-xs text-cj-text-muted">Cliente</p>
              <p className="text-sm font-medium text-cj-text-primary">{displayName}</p>
            </div>
          </div>
          {(thread.client?.company_name || thread.company_name) && (
            <div className="flex items-center gap-3 text-cj-text-secondary">
              <Building2 className="w-4 h-4 text-cj-text-muted shrink-0" />
              <div>
                <p className="text-xs text-cj-text-muted">Empresa</p>
                <p className="text-sm text-cj-text-primary">{thread.client?.company_name || thread.company_name}</p>
              </div>
            </div>
          )}
          {thread.client?.email && (
            <div className="flex items-center gap-3 text-cj-text-secondary">
              <Mail className="w-4 h-4 text-cj-text-muted shrink-0" />
              <div>
                <p className="text-xs text-cj-text-muted">Email</p>
                <p className="text-sm break-all text-cj-text-primary">{thread.client.email}</p>
              </div>
            </div>
          )}
          {thread.client?.phone && (
            <div className="flex items-center gap-3 text-cj-text-secondary">
              <Phone className="w-4 h-4 text-cj-text-muted shrink-0" />
              <div>
                <p className="text-xs text-cj-text-muted">Teléfono</p>
                <p className="text-sm text-cj-text-primary">{thread.client.phone}</p>
              </div>
            </div>
          )}
          {(thread.client_address || thread.location_notes || thread.client?.address) && (
            <div className="flex items-start gap-3 text-cj-text-secondary">
              <MapPin className="w-4 h-4 mt-1 text-cj-text-muted shrink-0" />
              <div>
                <p className="text-xs text-cj-text-muted">Ubicación</p>
                <p className="text-sm text-cj-text-primary">
                  {thread.location_notes || thread.client_address || thread.client?.address}
                </p>
              </div>
            </div>
          )}
          {thread.budget_estimate != null && (
            <div className="flex items-center gap-3 text-emerald-600">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-emerald-700">Presupuesto Cliente</p>
                <p className="text-lg font-bold">
                  ${Number(thread.budget_estimate).toLocaleString('es-VE')}
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-cj-border">
            <p className="text-xs text-cj-text-muted uppercase mb-2">Requerimiento Original</p>
            <p className="text-sm text-cj-text-secondary bg-cj-bg-tertiary p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
              {thread.requirements}
            </p>
          </div>
        </div>
      </aside>

      {/* Columna de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-cj-border p-4 flex items-center justify-between bg-cj-surface">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={onBack} className="text-cj-text-secondary hover:text-cj-text-primary shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h3 className="text-cj-text-primary font-medium truncate">{displayName}</h3>
              <p className="text-xs text-cj-text-muted truncate">
                {thread.service_name} · {thread.client?.company_name || thread.company_name || 'Sin empresa'}
              </p>
            </div>
          </div>
          <div className={`xl:hidden px-3 py-1 rounded-full text-xs border ${currentStatus?.color}`}>
            {currentStatus?.label || thread.status}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cj-bg-primary">
          {messages.map((msg, idx) => {
            const isAdmin = msg.sender_type === 'admin';
            const isSystem = msg.sender_type === 'system';
            const showHeader = idx === 0 || messages[idx - 1].sender_type !== msg.sender_type;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="bg-cj-bg-secondary border border-cj-border rounded-lg px-4 py-2 text-xs text-cj-text-secondary flex items-center gap-2">
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
                    <p className="text-xs text-cj-text-muted mb-1">{msg.sender_name || displayName}</p>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    isAdmin
                      ? 'bg-cj-accent-blue text-white rounded-br-md'
                      : 'bg-cj-bg-secondary text-cj-text-primary rounded-bl-md border border-cj-border'
                  }`}>
                    {msg.content && msg.message_type !== 'image' && msg.message_type !== 'invoice_mention' && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.message_type === 'invoice_mention' && msg.invoices && (
                      <div>
                        {msg.content && !msg.content.startsWith('Facturas referenciadas') && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{msg.content}</p>
                        )}
                        <InvoiceMentionBubble invoices={msg.invoices} fromAdmin={isAdmin} />
                      </div>
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
                        className={`flex items-center gap-3 mt-2 p-3 rounded-lg transition-colors ${
                          isAdmin
                            ? 'bg-white/15 hover:bg-white/25'
                            : 'bg-cj-bg-tertiary hover:bg-cj-bg-secondary'
                        }`}
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
                    <span className="text-[10px] text-cj-text-muted">{formatRelative(msg.created_at)}</span>
                    {isAdmin && (msg.read_at ? <CheckCheck className="w-3 h-3 text-cj-accent-blue" /> : <Check className="w-3 h-3 text-cj-text-muted" />)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-cj-border p-4 bg-cj-surface">
          {previewFile && (
            <div className="mb-3 bg-cj-bg-secondary border border-cj-border rounded-lg p-3 flex items-center gap-3 max-w-4xl mx-auto">
              {previewFile.type.startsWith('image/') ? (
                <img src={previewFile.url} alt="preview" className="w-10 h-10 rounded object-cover" />
              ) : (
                getFileIcon(previewFile.type)
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-cj-text-primary truncate">{previewFile.name}</p>
                <p className="text-[10px] text-cj-text-muted">Listo para enviar</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-cj-text-secondary hover:text-cj-danger"
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
              className="p-2.5 text-cj-text-muted hover:text-cj-text-primary rounded-xl hover:bg-cj-bg-secondary disabled:opacity-50"
              title="Adjuntar archivo"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-cj-text-muted border-t-transparent rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setInvoicePickerOpen(true)}
              disabled={sending}
              className="p-2.5 text-cj-text-muted hover:text-emerald-600 rounded-xl hover:bg-cj-bg-secondary disabled:opacity-50"
              title="Adjuntar facturas del cliente"
            >
              <Receipt className="w-5 h-5" />
            </button>

            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Responder al cliente..."
              disabled={sending}
              className="flex-1 bg-cj-bg-primary border border-cj-border rounded-xl px-4 py-3 text-sm text-cj-text-primary placeholder-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light resize-none max-h-32 min-h-[44px] disabled:opacity-60"
              rows={1}
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || (!newMessage.trim() && !previewFile) || uploading}
              className="p-3 bg-cj-accent-blue hover:bg-cj-accent-blue-hover disabled:bg-cj-bg-tertiary disabled:text-cj-text-muted text-white rounded-xl transition-all active:scale-95"
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <InvoiceSelectorModal
        open={invoicePickerOpen}
        clientIdForAdmin={thread.client_id}
        onClose={() => setInvoicePickerOpen(false)}
        onConfirm={sendInvoiceMention}
      />
    </div>
  );
}
