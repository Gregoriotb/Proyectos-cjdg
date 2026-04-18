import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../../services/api';
import {
  Send, Paperclip, MapPin, Building2, DollarSign,
  Clock, Check, CheckCheck, ArrowLeft, AlertCircle,
  FileText, Image as ImageIcon, X, Download, File as FileIcon,
  Receipt,
} from 'lucide-react';
import InvoiceSelectorModal from './InvoiceSelectorModal';
import InvoiceMentionBubble, { InvoiceBriefData } from './InvoiceMentionBubble';

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

interface ThreadInfo {
  id: string;
  service_name: string;
  company_name?: string;
  client_address?: string;
  location_notes?: string;
  budget_estimate?: number | string;
  status: string;
  requirements: string;
  client_unread: number;
  admin_unread: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  quoted: 'bg-green-50 text-green-700 border-green-200',
  negotiating: 'bg-purple-50 text-purple-700 border-purple-200',
  closed: 'bg-gray-50 text-gray-700 border-gray-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', active: 'En Proceso', quoted: 'Cotizado',
  negotiating: 'Negociando', closed: 'Cerrado', cancelled: 'Cancelado',
};

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

interface Props {
  threadId: string;
  onBack: () => void;
}

export default function ClientChatView({ threadId, onBack }: Props) {
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [invoicePickerOpen, setInvoicePickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadThread = useCallback(async () => {
    try {
      const res = await api.get(`/chat-quotations/threads/${threadId}`);
      setThread(res.data);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error('Error cargando hilo:', e);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadThread();
    const interval = setInterval(loadThread, 10000);
    return () => clearInterval(interval);
  }, [loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (sending) return;
    if (!newMessage.trim() && !previewFile) return;

    const contentToSend = newMessage.trim();
    const fileToSend = previewFile;
    // Limpieza optimista para que el usuario vea que ya "salió"
    setNewMessage('');
    setPreviewFile(null);
    setSending(true);

    try {
      const res = await api.post(`/chat-quotations/threads/${threadId}/messages`, {
        content: contentToSend || (fileToSend ? `Adjunto: ${fileToSend.name}` : ''),
        message_type: fileToSend ? (fileToSend.type.startsWith('image/') ? 'image' : 'file') : 'text',
        attachment_url: fileToSend?.url || null,
        attachment_name: fileToSend?.name || null,
        attachment_type: fileToSend?.type || null,
      });
      setMessages((prev) => [...prev, res.data]);
    } catch (e) {
      console.error(e);
      // Restauramos el input si falló, para que el usuario no pierda lo escrito
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
      const res = await api.post(`/chat-quotations/threads/${threadId}/messages`, {
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sending) handleSend();
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
        `/chat-quotations/threads/${threadId}/attachments`,
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-cj-text-secondary">Cargando conversación...</div>;
  }
  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-cj-danger gap-3">
        <p>Hilo no encontrado.</p>
        <button onClick={onBack} className="text-sm text-cj-accent-blue hover:underline">
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-cj-bg-primary rounded-xl border border-cj-border shadow-cj-md overflow-hidden">
      {/* Sidebar con contexto */}
      <aside className="w-80 border-r border-cj-border bg-cj-bg-secondary p-6 hidden lg:flex flex-col">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cj-text-secondary hover:text-cj-text-primary mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a cotizaciones
        </button>

        <h2 className="text-lg font-semibold text-cj-text-primary mb-2">{thread.service_name}</h2>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-6 w-fit ${STATUS_COLORS[thread.status]}`}>
          <AlertCircle className="w-3 h-3" />
          {STATUS_LABELS[thread.status] || thread.status}
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {thread.company_name && (
            <div className="flex items-start gap-3 text-cj-text-secondary">
              <Building2 className="w-4 h-4 mt-1 text-cj-text-muted shrink-0" />
              <div>
                <p className="text-xs text-cj-text-muted uppercase">Empresa</p>
                <p className="text-sm text-cj-text-primary">{thread.company_name}</p>
              </div>
            </div>
          )}
          {(thread.client_address || thread.location_notes) && (
            <div className="flex items-start gap-3 text-cj-text-secondary">
              <MapPin className="w-4 h-4 mt-1 text-cj-text-muted shrink-0" />
              <div>
                <p className="text-xs text-cj-text-muted uppercase">Ubicación</p>
                <p className="text-sm text-cj-text-primary">{thread.location_notes || thread.client_address}</p>
              </div>
            </div>
          )}
          {thread.budget_estimate != null && (
            <div className="flex items-start gap-3 text-cj-text-secondary">
              <DollarSign className="w-4 h-4 mt-1 text-cj-text-muted shrink-0" />
              <div>
                <p className="text-xs text-cj-text-muted uppercase">Presupuesto Estimado</p>
                <p className="text-sm font-medium text-emerald-600">
                  ${Number(thread.budget_estimate).toLocaleString('es-VE')}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 text-cj-text-secondary">
            <Clock className="w-4 h-4 mt-1 text-cj-text-muted shrink-0" />
            <div>
              <p className="text-xs text-cj-text-muted uppercase">Solicitud Original</p>
              <p className="text-sm text-cj-text-secondary bg-cj-bg-tertiary p-2 rounded-lg mt-1 whitespace-pre-wrap">
                {thread.requirements}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Columna de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header móvil */}
        <div className="border-b border-cj-border p-4 flex items-center justify-between bg-cj-surface lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-cj-text-secondary hover:text-cj-text-primary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-cj-text-primary font-medium text-sm">{thread.service_name}</h3>
              <p className="text-xs text-cj-text-muted">Conversación activa</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs border ${STATUS_COLORS[thread.status]}`}>
            {STATUS_LABELS[thread.status] || thread.status}
          </div>
        </div>

        {/* Header desktop */}
        <div className="hidden lg:flex border-b border-cj-border p-4 items-center justify-between bg-cj-surface">
          <div>
            <h3 className="text-cj-text-primary font-medium">{thread.service_name}</h3>
            <p className="text-xs text-cj-text-muted">#{thread.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cj-bg-primary">
          {messages.map((msg, idx) => {
            const isClient = msg.sender_type === 'client';
            const isSystem = msg.sender_type === 'system';
            const showAvatar = idx === 0 || messages[idx - 1].sender_type !== msg.sender_type;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="bg-cj-bg-secondary border border-cj-border rounded-lg px-4 py-2 text-xs text-cj-text-secondary flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] sm:max-w-[70%] ${isClient ? 'order-2' : 'order-1'}`}>
                  {showAvatar && !isClient && (
                    <p className="text-xs text-cj-text-muted mb-1 ml-1">{msg.sender_name || 'Admin CJDG'}</p>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    isClient
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
                        <InvoiceMentionBubble invoices={msg.invoices} fromAdmin={!isClient} />
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
                        {msg.attachment_name && (
                          <p className="text-[10px] mt-1 opacity-70">{msg.attachment_name}</p>
                        )}
                      </div>
                    )}
                    {msg.attachment_url && msg.message_type === 'file' && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 mt-2 p-3 rounded-lg transition-colors ${
                          isClient
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
                  <div className={`flex items-center gap-1 mt-1 ${isClient ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-cj-text-muted">{formatRelative(msg.created_at)}</span>
                    {isClient && (msg.read_at ? <CheckCheck className="w-3 h-3 text-cj-accent-blue" /> : <Check className="w-3 h-3 text-cj-text-muted" />)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
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
                className="text-cj-text-secondary hover:text-cj-danger transition-colors"
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
              className="p-2.5 text-cj-text-muted hover:text-cj-text-primary transition-colors rounded-xl hover:bg-cj-bg-secondary disabled:opacity-50"
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
              className="p-2.5 text-cj-text-muted hover:text-emerald-600 transition-colors rounded-xl hover:bg-cj-bg-secondary disabled:opacity-50"
              title="Adjuntar facturas"
            >
              <Receipt className="w-5 h-5" />
            </button>

            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={sending}
              className="flex-1 bg-cj-bg-primary border border-cj-border rounded-xl px-4 py-3 text-sm text-cj-text-primary placeholder-cj-text-muted focus:outline-none focus:ring-2 focus:ring-cj-accent-blue-light resize-none max-h-32 min-h-[44px] disabled:opacity-60"
              rows={1}
            />

            <button
              type="button"
              onClick={handleSend}
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
        onClose={() => setInvoicePickerOpen(false)}
        onConfirm={sendInvoiceMention}
      />
    </div>
  );
}
