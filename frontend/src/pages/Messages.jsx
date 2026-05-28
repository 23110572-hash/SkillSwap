import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

function Messages({ user, token, activeChatUser, setActiveChatUser }) {
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(activeChatUser || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState('');
  
  const chatEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Fetch all active conversations on mount
  useEffect(() => {
    fetchConversations();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll messages every 3 seconds for the active chat
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    if (activePartner) {
      fetchMessages(activePartner.id, true);
      // Start polling
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(activePartner.id, false);
      }, 3000);
    } else {
      setMessages([]);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activePartner]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setLoadingConv(true);
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let convList = res.data;
      
      // If we entered with an activeChatUser from Marketplace, ensure they exist in the convList list
      if (activeChatUser && !convList.some(c => c.user_id === activeChatUser.id)) {
        convList = [{
          user_id: activeChatUser.id,
          username: activeChatUser.username,
          email: activeChatUser.email || '',
          last_message: 'Start a conversation...',
          last_message_time: new Date().toISOString(),
          last_message_sender_id: user.id
        }, ...convList];
      }
      
      setConversations(convList);
      
      // If we have an active chat user but no activePartner state is set yet
      if (activeChatUser && !activePartner) {
        setActivePartner(activeChatUser);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
      setError("Failed to load chats.");
    } finally {
      setLoadingConv(false);
    }
  };

  const fetchMessages = async (partnerId, showLoading) => {
    if (showLoading) setLoadingMsgs(true);
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/messages?with_user_id=${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      if (showLoading) setLoadingMsgs(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activePartner) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // optimistic clear

    try {
      const res = await axios.post(
        'http://127.0.0.1:5000/api/messages',
        { recipient_id: activePartner.id, content: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Append message locally
      setMessages(prev => [...prev, res.data]);
      
      // Update conversations list summary locally
      setConversations(prev => {
        const index = prev.findIndex(c => c.user_id === activePartner.id);
        const updated = {
          user_id: activePartner.id,
          username: activePartner.username,
          email: activePartner.email || '',
          last_message: messageText,
          last_message_time: new Date().toISOString(),
          last_message_sender_id: user.id
        };
        if (index > -1) {
          const filtered = prev.filter(c => c.user_id !== activePartner.id);
          return [updated, ...filtered];
        } else {
          return [updated, ...prev];
        }
      });
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message.");
    }
  };

  const handleSelectConversation = (conv) => {
    // Clear global activeChatUser state once selected inside page to keep states synchronized
    if (activeChatUser) {
      setActiveChatUser(null);
    }
    setActivePartner({ id: conv.user_id, username: conv.username, email: conv.email });
  };

  return (
    <div className="w-full max-w-[1600px] flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[550px] items-stretch">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-80 card p-4 flex flex-col border-slate-200/80">
        <h3 className="text-lg font-black text-slate-900 mb-4 px-1 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-500" />
          <span>Active Chats</span>
        </h3>
        
        {error && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-bold mb-3">{error}</div>}
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {conversations.length > 0 ? (
            conversations.map((conv) => {
              const isActive = activePartner?.id === conv.user_id;
              return (
                <button
                  key={conv.user_id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer group ${
                    isActive 
                      ? 'bg-primary-50 border-primary-200 shadow-sm shadow-primary-500/5' 
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${
                    isActive ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {conv.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-primary-950' : 'text-slate-800'}`}>
                        {conv.username}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate font-medium ${isActive ? 'text-primary-700' : 'text-slate-450'}`}>
                      {conv.last_message_sender_id === user.id ? 'You: ' : ''}{conv.last_message}
                    </p>
                  </div>
                </button>
              );
            })
          ) : loadingConv ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">Loading chats...</span>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold leading-normal">
              No active conversations yet. Visit the Marketplace and chat with members to inquire!
            </div>
          )}
        </div>
      </div>

      {/* Message Pane */}
      <div className="flex-1 card p-0 flex flex-col border-slate-200/80 overflow-hidden bg-white">
        {activePartner ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs border border-primary-250">
                  {activePartner.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{activePartner.username}</h4>
                  <p className="text-[10px] text-slate-455 font-semibold">{activePartner.email || 'Member'}</p>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading message history...</span>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === user.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        isOwn 
                          ? 'bg-primary-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-200/60 rounded-tl-none'
                      }`}>
                        <p>{msg.content}</p>
                        <span className={`block text-[9px] mt-1 text-right ${isOwn ? 'text-primary-100' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-8 leading-normal text-center max-w-sm mx-auto">
                  <MessageSquare className="w-8 h-8 mb-2.5 text-slate-300" />
                  <p className="font-semibold">Start your chat with {activePartner.username}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Ask about session materials, timing availability, or request special customized schedules.</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex gap-3 bg-white">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${activePartner.username}...`}
                className="flex-1 px-4.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-colors text-xs font-semibold"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shadow-sm shadow-primary-500/10 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 max-w-md mx-auto h-full">
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-full w-14 h-14 flex items-center justify-center text-slate-400 mb-4 shadow-sm">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1">No Chat Selected</h4>
            <p className="text-xs text-slate-450 leading-relaxed font-semibold">
              Select an active conversation from the sidebar, or inquire with a skill instructor directly from the Skill Marketplace.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
