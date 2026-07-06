'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, X, MessageSquare, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface IntercomChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: any[];
  onSendMessage: (msg: string) => void;
}

export default function IntercomChat({ isOpen, onClose, messages, onSendMessage }: IntercomChatProps) {
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90] transition-opacity" 
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed right-0 top-0 h-screen w-80 sm:w-96 bg-white dark:bg-[#1c1f2e] border-l border-slate-200 dark:border-white/10 shadow-2xl z-[100] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <MessageSquare size={18} />
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-800 dark:text-white">Klinik İçi İnterkom</h4>
              <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aktif Bağlantı
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-[#151722] scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20 space-y-2">
              <MessageSquare size={32} className="text-slate-400" />
              <p className="text-[11px] font-bold text-slate-500">Henüz mesaj yok</p>
              <p className="text-[9px] font-medium text-slate-400 max-w-[180px]">Klinikteki diğer aktif personellere anlık mesaj gönderebilirsiniz.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.link === user?.id; // link matches senderId
              return (
                <div 
                  key={msg.id || i} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                      {isMe ? 'Siz' : msg.title}
                    </span>
                    <span className="text-[8px] text-slate-300 dark:text-slate-600">
                      {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div 
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-[12.5px] font-medium leading-relaxed shadow-sm ${
                      isMe 
                        ? 'bg-violet-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-[#1c1f2e] text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-white/5 rounded-tl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input */}
        <form 
          onSubmit={handleSend} 
          className="p-3 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] flex items-center gap-2"
        >
          <input 
            type="text" 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Mesajınızı yazın..." 
            className="flex-grow px-3.5 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-violet-500 focus:bg-white transition-all dark:text-white dark:placeholder-slate-500"
          />
          <button 
            type="submit" 
            disabled={!text.trim()} 
            className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-violet-500/20"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </>
  );
}
