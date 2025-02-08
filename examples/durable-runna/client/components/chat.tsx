import { useParams } from '@tanstack/react-router'
import usePartySocket from 'partysocket/react'
import { useEffect, useState } from 'react'
import '../styles/chat.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatProps {
  planId: string
}

export const ChatInterface = () => {
  const { planId } = useParams({ from: '/chat/$planId' })
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  
  const socket = usePartySocket({
    room: planId,
    party: "durable-runna",
    onMessage(event) {
      try {
        const data = JSON.parse(event.data)
        console.log(data)
        if (data.type === 'message') {
          setMessages(prev => [...prev, {
            role: data.role,
            content: data.content,
            timestamp: Date.now()
          }])
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    },
  })

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/${planId}/messages`)
        const data = await response.json() as { success: boolean, messages: Message[] }
        setMessages(data.messages)
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }

    fetchMessages()
  }, [planId])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const message = {
      type: 'message',
      content: inputMessage,
      role: 'user'
    }

    socket.send(JSON.stringify(message))
    setMessages(prev => [...prev, {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    }])
    setInputMessage('')
  }

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={message.timestamp + index}
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">{message.content}</div>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="input-container">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  )
}
