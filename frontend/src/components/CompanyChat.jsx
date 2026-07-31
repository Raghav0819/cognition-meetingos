import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const ROLE_COLORS = {
  pm:       '#c084fc', // purple
  manager:  '#34d399', // green
  employee: '#60a5fa', // blue
}

export default function CompanyChat() {
  const { userProfile } = useAuth()
  const { toast } = useToast()
  
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  
  const messagesEndRef = useRef(null)
  
  // Only render if the user is authenticated and part of a company
  if (!userProfile || !userProfile.companyId) return null

  useEffect(() => {
    // Reference to the company's messages subcollection
    const messagesRef = collection(firestore, 'companies', userProfile.companyId, 'messages')
    // Order by createdAt ascending
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = []
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() })
      })
      
      setMessages(fetched)
      setLoading(false)
      
      // If the chat is closed and we received new messages (after initial load),
      // we could increment the unread count. For simplicity, just increment if the length changed and not open.
      if (!isOpen && fetched.length > messages.length && !loading) {
         setUnread(prev => prev + 1)
      }
    }, (error) => {
      console.error("Chat listener error:", error)
      toast('Failed to connect to team chat', 'error')
    })

    return () => unsubscribe()
  }, [userProfile.companyId, isOpen]) // Re-evaluate unread logic when isOpen changes

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) setUnread(0)
  }, [isOpen])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  async function handleSend(e) {
    e.preventDefault()
    if (!inputText.trim()) return

    const msg = inputText.trim()
    setInputText('')

    try {
      const messagesRef = collection(firestore, 'companies', userProfile.companyId, 'messages')
      await addDoc(messagesRef, {
        text: msg,
        senderId: userProfile.uid,
        senderName: userProfile.name,
        senderRole: userProfile.role,
        createdAt: serverTimestamp()
      })
    } catch (err) {
      console.error("Error sending message:", err)
      toast('Failed to send message', 'error')
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999 }}>
      
      {/* ── Chat Window ─────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 70, right: 0,
        width: 340, height: 480,
        background: '#0f111a',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transformOrigin: 'bottom right',
        transform: isOpen ? 'scale(1)' : 'scale(0.8)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          padding: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Team Chat</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            style={{ 
              background: 'rgba(255,255,255,0.2)', border: 'none', 
              color: '#fff', width: 26, height: 26, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 12
            }}
          >
            ✕
          </button>
        </div>

        {/* Message List */}
        <div style={{ 
          flex: 1, overflowY: 'auto', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 16,
          background: 'rgba(255,255,255,0.01)'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: 13 }}>
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: 13 }}>
              No messages yet. Say hello!
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === userProfile.uid
              const roleColor = ROLE_COLORS[msg.senderRole] || '#9ca3af'
              
              // Only show name header if it's not me, and previous message wasn't from the same person
              const showHeader = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId)

              return (
                <div key={msg.id} style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}>
                  {showHeader && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 }}>
                      <span style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600 }}>{msg.senderName}</span>
                      <span style={{ 
                        color: roleColor, fontSize: 9, fontWeight: 700, 
                        background: `${roleColor}22`, padding: '2px 6px', borderRadius: 10,
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        {msg.senderRole}
                      </span>
                    </div>
                  )}
                  
                  <div style={{
                    background: isMe ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${isMe ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
                    color: '#fff', fontSize: 13, lineHeight: 1.4,
                    padding: '10px 14px',
                    borderRadius: 16,
                    borderBottomRightRadius: isMe ? 4 : 16,
                    borderBottomLeftRadius: isMe ? 16 : 4,
                  }}>
                    {msg.text}
                  </div>
                  
                  <span style={{ color: '#6b7280', fontSize: 10, marginTop: 4, padding: '0 4px' }}>
                    {msg.createdAt?.toDate ? 
                      msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                      'Just now'}
                  </span>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                borderRadius: 20, padding: '10px 16px', fontSize: 13, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{
                background: inputText.trim() ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                color: '#fff', border: 'none', width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: inputText.trim() ? 'pointer' : 'default', transition: 'all 0.2s',
                opacity: inputText.trim() ? 1 : 0.5
              }}
            >
              ➤
            </button>
          </form>
        </div>
      </div>

      {/* ── Floating Button ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="anim-fade-up"
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#fff', transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(-15deg) scale(0.9)' : 'scale(1)',
          position: 'relative'
        }}
        onMouseEnter={e => !isOpen && (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => !isOpen && (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? '✕' : '💬'}
        
        {/* Unread badge */}
        {!isOpen && unread > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            background: '#ef4444', color: '#fff',
            fontSize: 11, fontWeight: 700,
            width: 22, height: 22, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0f111a'
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

    </div>
  )
}
