import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../../services/api';
import {
  Send, Paperclip, MapPin, Building2, DollarSign,
  Clock, Check, CheckCheck, ArrowLeft, AlertCircle,
  FileText, Image as ImageIcon, X, Download, File as FileIcon,
} from 'lucide-react';

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
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  active: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  quoted: 'bg-green-500/20 text-green-300 border-green-500/50',
  negotiating: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  closed: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/50',
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
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
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
    if (!newMessage.trim() && !previewFile) return;
    try {
      await api.post(`/chat-quotations/threads/${threadId}/messages`, {
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    if (!type) return <FileIcon className="w-8 h-8 text-blue-400" />;
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-purple-400" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
    return <FileIcon className="w-8 h-8 text-blue-400" />;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Cargando conversación...</div>;
  }
  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400 gap-3">
        <p>Hilo no encontrado.</p>
        <button onClick={onBack} className="text-sm text-blue-400 hover:underline">
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      {/* Sidebar con contexto */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/50 p-6 hidden lg:flex flex-col">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a cotizaciones
        </button>

        <h2 className="text-lg font-semibold text-white mb-2">{thread.service_name}</h2>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-6 w-fit ${STATUS_COLORS[thread.status]}`}>
          <AlertCircle className="w-3 h-3" />
          {STATUS_LABELS[thread.status] || thread.status}
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {thread.company_name && (
            <div className="flex items-start gap-3 text-slate-300">
              <Building2 className="w-4 h-4 mt-1 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase">Empresa</p>
                <p className="text-sm">{thread.company_name}</p>
              </div>
            </div>
          )}
          {(thread.client_address || thread.location_notes) && (
            <div className="flex items-start gap-3 text-slate-300">
              <MapPin className="w-4 h-4 mt-1 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase">Ubicación</p>
                <p className="text-sm">{thread.location_notes || thread.client_address}</p>
              </div>
            </div>
          )}
          {thread.budget_estimate != null && (
            <div className="flex items-start gap-3 text-slate-300">
              <DollarSign className="w-4 h-4 mt-1 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase">Presupuesto Estimado</p>
                <p className="text-sm font-medium text-emerald-400">
                  ${Number(thread.budget_estimate).toLocaleString('es-VE')}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 text-slate-300">
            <Clock className="w-4 h-4 mt-1 text-slate-500 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 uppercase">Solicitud Original</p>
              <p className="text-sm text-slate-400 bg-slate-800/30 p-2 rounded-lg mt-1 whitespace-pre-wrap">
                {thread.requirements}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Columna de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header móvil */}
        <div className="border-b border-slate-800 p-4 flex items-center justify-between bg-slate-900/80 lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-white font-medium text-sm">{thread.service_name}</h3>
              <p className="text-xs text-slate-500">Conversación activa</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs border ${STATUS_COLORS[thread.status]}`}>
            {STATUS_LABELS[thread.status] || thread.status}
          </div>
        </div>

        {/* Header desktop */}
        <div className="hidden lg:flex border-b border-slate-800 p-4 items-center justify-between bg-slate-900/80">
          <div>
            <h3 className="text-white font-medium">{thread.service_name}</h3>
            <p className="text-xs text-slate-500">#{thread.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
          {messages.map((msg, idx) => {
            const isClient = msg.sender_type === 'client';
            const isSystem = msg.sender_type === 'system';
            const showAvatar = idx === 0 || messages[idx - 1].sender_type !== msg.sender_type;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-xs text-slate-400 flex items-center gap-2">
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
                    <p className="text-xs text-slate-500 mb-1 ml-1">{msg.sender_name || 'Admin CJDG'}</p>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    isClient
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
                  <div className={`flex items-center gap-1 mt-1 ${isClient ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-slate-600">{formatRelative(msg.created_at)}</span>
                    {isClient && (msg.read_at ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-slate-600" />)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
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
                className="text-slate-400 hover:text-red-400 transition-colors"
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
              className="p-2.5 text-slate-500 hover:text-slate-300 transition-colors rounded-xl hover:bg-slate-800 disabled:opacity-50"
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
              onKeyDown={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none max-h-32 min-h-[44px]"
              rows={1}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={(!newMessage.trim() && !previewFile) || uploading}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
