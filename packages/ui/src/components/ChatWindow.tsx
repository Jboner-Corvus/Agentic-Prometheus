import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Textarea } from './ui/textarea';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
}

interface ChatWindowProps {
  messages: Message[];
  isProcessing: boolean;
  messageInputValue: string;
  serverHealthy: boolean;
  authToken: string | null;
  sessionId: string | null;
  handleMessageInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSendMessage: (event: React.FormEvent) => void;
}

export function ChatWindow({
  messages,
  isProcessing,
  messageInputValue,
  serverHealthy,
  authToken,
  sessionId,
  handleMessageInputChange,
  handleSendMessage,
}: ChatWindowProps) {
  return (
    <main className="flex-1 p-4 flex flex-col bg-gray-900">
      <Card className="flex-1 flex flex-col bg-gray-800 border-gray-700 text-gray-100">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          <section aria-live="assertive" className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
                  <div className="message-content prose prose-invert">
                  {msg.sender === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-100 p-3 rounded-lg typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </section>
        </CardContent>
        <div className="p-4 border-t border-gray-700">
          <form className="flex items-center space-x-2" onSubmit={handleSendMessage}>
            <Button aria-label="Attach file" type="button" variant="ghost" className="text-gray-400 hover:text-gray-100">
              <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.49"></path></svg>
            </Button>
            <Textarea
              aria-label="Message input field"
              className="flex-1 bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 resize-none"
              id="messageInput"
              onInput={handleMessageInputChange}
              placeholder={
                isProcessing
                  ? "🤔 L'agent réfléchit..."
                  : !serverHealthy
                  ? '🏥 Serveur hors ligne...'
                  : !authToken
                  ? '🔑 Veuillez sauvegarder un Bearer Token...'
                  : '💬 Décrivez votre objectif...'
              }
              value={messageInputValue}
              rows={1}
              disabled={!authToken || !sessionId || isProcessing || !serverHealthy}
            />
            <Button
              aria-label="Send Message"
              type="submit"
              disabled={!authToken || !sessionId || isProcessing || !serverHealthy}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <span>Envoyer</span><span aria-hidden="true">→</span>
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}