'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Send, Plus, Users, ArrowLeft, Check, CheckCheck } from 'lucide-react';

// ─── Mock Veriler ───
const STAFF = [
  { id: 's1', name: 'Dr. Ayşe Kaya', role: 'Hekim', avatar: 'AK', online: true, color: 'bg-emerald-500' },
  { id: 's2', name: 'Dr. Mehmet Demir', role: 'Hekim', avatar: 'MD', online: true, color: 'bg-blue-500' },
  { id: 's3', name: 'Zeynep Çelik', role: 'Asistan', avatar: 'ZÇ', online: true, color: 'bg-purple-500' },
  { id: 's4', name: 'Fatma Şahin', role: 'Sekreter', avatar: 'FŞ', online: false, color: 'bg-pink-500' },
  { id: 's5', name: 'Can Yıldız', role: 'Asistan', avatar: 'CY', online: true, color: 'bg-amber-500' },
  { id: 's6', name: 'Ali Koç', role: 'Laborant', avatar: 'AK', online: false, color: 'bg-teal-500' },
];

interface Message {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
  read: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isGroup: boolean;
  online?: boolean;
  members?: string[];
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
}

const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', name: 'Dr. Ayşe Kaya', avatar: 'AK', color: 'bg-emerald-500', isGroup: false, online: true,
    lastMessage: 'Hasta röntgenini gönderdim', lastTime: '14:32', unread: 2,
    messages: [
      { id: 'm1', text: 'Merhaba, P-0001 hastasının durumu ne oldu?', time: '14:20', fromMe: false, read: true },
      { id: 'm2', text: 'Tedavi planını hazırladım, kontrol edebilir misiniz?', time: '14:25', fromMe: true, read: true },
      { id: 'm3', text: 'Tamam bakıyorum şimdi', time: '14:28', fromMe: false, read: true },
      { id: 'm4', text: 'Hasta röntgenini gönderdim', time: '14:32', fromMe: false, read: false },
    ]
  },
  {
    id: 'c2', name: 'Klinik Genel', avatar: '🏥', color: 'bg-metronic-primary', isGroup: true,
    members: ['Dr. Ayşe Kaya', 'Dr. Mehmet Demir', 'Zeynep Çelik', 'Can Yıldız'],
    lastMessage: 'Yarınki randevular güncellendi', lastTime: '13:45', unread: 5,
    messages: [
      { id: 'm1', text: 'Yarın saat 10:00 toplantı var, lütfen katılın', time: '13:30', fromMe: false, read: true },
      { id: 'm2', text: 'Not aldım, teşekkürler 👍', time: '13:35', fromMe: true, read: true },
      { id: 'm3', text: 'Yarınki randevular güncellendi', time: '13:45', fromMe: false, read: false },
    ]
  },
  {
    id: 'c3', name: 'Dr. Mehmet Demir', avatar: 'MD', color: 'bg-blue-500', isGroup: false, online: true,
    lastMessage: 'Protez siparişi verildi', lastTime: '12:10', unread: 0,
    messages: [
      { id: 'm1', text: 'Laboratuvardan protez ne zaman gelecek?', time: '11:50', fromMe: true, read: true },
      { id: 'm2', text: 'Protez siparişi verildi', time: '12:10', fromMe: false, read: true },
    ]
  },
  {
    id: 'c4', name: 'Zeynep Çelik', avatar: 'ZÇ', color: 'bg-purple-500', isGroup: false, online: true,
    lastMessage: 'Stok sayımı tamamlandı ✅', lastTime: 'Dün', unread: 0,
    messages: [
      { id: 'm1', text: 'Stok sayımını bugün bitirebilir misin?', time: '16:00', fromMe: true, read: true },
      { id: 'm2', text: 'Stok sayımı tamamlandı ✅', time: '17:30', fromMe: false, read: true },
    ]
  },
  {
    id: 'c5', name: 'Hekimler Grubu', avatar: '⚕️', color: 'bg-rose-500', isGroup: true,
    members: ['Dr. Ayşe Kaya', 'Dr. Mehmet Demir'],
    lastMessage: 'Yeni protokol hakkında konuşalım', lastTime: 'Dün', unread: 0,
    messages: [
      { id: 'm1', text: 'Yeni tedavi protokolünü incelediniz mi?', time: '09:00', fromMe: false, read: true },
      { id: 'm2', text: 'Yeni protokol hakkında konuşalım', time: '09:15', fromMe: true, read: true },
    ]
  },
];

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  const filteredConvos = conversations.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendMessage = () => {
    if (!messageInput.trim() || !activeChat) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      fromMe: true,
      read: false,
    };
    const updated = conversations.map(c =>
      c.id === activeChat.id
        ? { ...c, messages: [...c.messages, newMsg], lastMessage: newMsg.text, lastTime: newMsg.time }
        : c
    );
    setConversations(updated);
    setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, newMsg], lastMessage: newMsg.text, lastTime: newMsg.time } : null);
    setMessageInput('');
  };

  const createGroup = () => {
    if (!groupName.trim() || selectedMembers.length < 2) return;
    const memberNames = selectedMembers.map(id => STAFF.find(s => s.id === id)?.name || '');
    const newGroup: Conversation = {
      id: `g${Date.now()}`,
      name: groupName.trim(),
      avatar: '👥',
      color: 'bg-indigo-500',
      isGroup: true,
      members: memberNames,
      lastMessage: 'Grup oluşturuldu',
      lastTime: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      messages: [{ id: 'm1', text: 'Grup oluşturuldu 🎉', time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), fromMe: true, read: true }],
    };
    setConversations(prev => [newGroup, ...prev]);
    setShowNewGroup(false);
    setGroupName('');
    setSelectedMembers([]);
    setActiveChat(newGroup);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2.5 w-[420px] h-[520px] bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden z-50 flex flex-col"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.03)',
        animation: 'profileDropIn 0.2s ease-out'
      }}
    >
      {/* ─── AKTİF SOHBET GÖRÜNÜMÜ ─── */}
      {activeChat ? (
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex-shrink-0">
            <button onClick={() => setActiveChat(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div className={`w-9 h-9 rounded-full ${activeChat.color} flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 relative`}>
              {activeChat.isGroup ? activeChat.avatar : activeChat.avatar}
              {!activeChat.isGroup && activeChat.online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-[#1c1f2e]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h6 className="text-[13px] font-bold text-slate-800 dark:text-white truncate">{activeChat.name}</h6>
              <p className="text-[11px] text-slate-400 truncate">
                {activeChat.isGroup ? `${activeChat.members?.length} üye` : activeChat.online ? 'Çevrimiçi' : 'Çevrimdışı'}
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar" style={{ background: 'linear-gradient(180deg, rgba(241,245,249,0.3) 0%, rgba(241,245,249,0.1) 100%)' }}>
            {activeChat.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                  msg.fromMe
                    ? 'bg-metronic-primary text-white rounded-br-md'
                    : 'bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-bl-md shadow-sm'
                }`}>
                  <p>{msg.text}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${msg.fromMe ? 'text-white/60' : 'text-slate-400'}`}>
                    <span className="text-[10px]">{msg.time}</span>
                    {msg.fromMe && (msg.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#1c1f2e] flex-shrink-0">
            <input
              type="text"
              placeholder="Mesaj yazın..."
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-[13px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary/20 transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-metronic-primary text-white hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

      /* ─── YENİ GRUP OLUŞTUR ─── */
      ) : showNewGroup ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex-shrink-0">
            <button onClick={() => { setShowNewGroup(false); setSelectedMembers([]); setGroupName(''); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h6 className="text-[14px] font-bold text-slate-800 dark:text-white">Yeni Grup Oluştur</h6>
          </div>

          <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5">
            <input
              type="text"
              placeholder="Grup adı girin..."
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-metronic-primary transition-all"
            />
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedMembers.map(id => {
                  const s = STAFF.find(st => st.id === id);
                  return s ? (
                    <span key={id} className="flex items-center gap-1 px-2 py-1 bg-metronic-primary/10 text-metronic-primary text-[11px] font-bold rounded-full">
                      {s.name.split(' ')[0]}
                      <button onClick={() => setSelectedMembers(prev => prev.filter(m => m !== id))} className="hover:text-metronic-danger"><X size={10} /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <p className="px-4 pt-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Personel Seç (en az 2)</p>
            {STAFF.map(s => {
              const selected = selectedMembers.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedMembers(prev => selected ? prev.filter(m => m !== s.id) : [...prev, s.id])}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${selected ? 'bg-metronic-primary/5 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}`}
                >
                  <div className={`w-9 h-9 rounded-full ${s.color} flex items-center justify-center text-white text-[11px] font-bold relative flex-shrink-0`}>
                    {s.avatar}
                    {s.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-[#1c1f2e]" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.role}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'bg-metronic-primary border-metronic-primary' : 'border-slate-300 dark:border-white/20'}`}>
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
            <button
              onClick={createGroup}
              disabled={!groupName.trim() || selectedMembers.length < 2}
              className="w-full py-2.5 bg-metronic-primary text-white text-[13px] font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Users size={15} /> Grubu Oluştur ({selectedMembers.length} kişi)
            </button>
          </div>
        </div>

      /* ─── SOHBET LİSTESİ (ANA GÖRÜNÜM) ─── */
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
            <h6 className="text-[15px] font-bold text-slate-800 dark:text-white">Sohbet</h6>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewGroup(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-metronic-primary bg-metronic-primary/10 hover:bg-metronic-primary/20 rounded-lg transition-colors"
              >
                <Plus size={13} /> Yeni Grup
              </button>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Sohbet ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-metronic-primary transition-all"
              />
            </div>
          </div>

          {/* Online Staff Bar */}
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {STAFF.filter(s => s.online).map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    const existing = conversations.find(c => !c.isGroup && c.name === s.name);
                    if (existing) setActiveChat(existing);
                  }}
                  className="flex flex-col items-center gap-1 flex-shrink-0 group"
                >
                  <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center text-white text-[11px] font-bold relative ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-[#1c1f2e] group-hover:scale-105 transition-transform`}>
                    {s.avatar}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate w-12 text-center">{s.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredConvos.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-[13px]">Sohbet bulunamadı</div>
            ) : (
              filteredConvos.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => setActiveChat(convo)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors border-b border-slate-50 dark:border-white/[0.02] group"
                >
                  <div className={`w-11 h-11 rounded-full ${convo.color} flex items-center justify-center text-white text-[12px] font-bold relative flex-shrink-0`}>
                    {convo.avatar}
                    {!convo.isGroup && convo.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-[#1c1f2e]" />
                    )}
                    {convo.isGroup && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-slate-600 dark:bg-slate-500 rounded-full border-2 border-white dark:border-[#1c1f2e] flex items-center justify-center">
                        <Users size={8} className="text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <h6 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate pr-2 group-hover:text-metronic-primary transition-colors">{convo.name}</h6>
                      <span className={`text-[10px] font-medium flex-shrink-0 ${convo.unread > 0 ? 'text-metronic-primary font-bold' : 'text-slate-400'}`}>{convo.lastTime}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[12px] text-slate-400 truncate pr-2">{convo.lastMessage}</p>
                      {convo.unread > 0 && (
                        <span className="w-5 h-5 bg-metronic-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{convo.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
