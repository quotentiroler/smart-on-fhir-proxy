import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiAssistant, type ChatMessage, type RAGResponse } from '../lib/ai-assistant';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
    Bot,
    Minimize2,
    X,
    Send,
    Mic,
    MicOff,
    Brain,
    Sparkles,
    FileText
} from 'lucide-react';

interface AIChatOverlayProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function AIChatOverlay({ isOpen: externalIsOpen, onClose: externalOnClose }: AIChatOverlayProps = {}) {
    const { t } = useTranslation();
    
    // Internal state for managing open/close when no external control is provided
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
    const onClose = externalOnClose || (() => setInternalIsOpen(false));
    
    // Chat state
    const [isMinimized, setIsMinimized] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            type: 'agent',
            content: t('Hello! I\'m your SMART on FHIR assistant. I can help you manage applications, users, servers, and configurations. What would you like to do today?'),
            timestamp: new Date()
        }
    ]);
    const [currentMessage, setCurrentMessage] = useState('');

    const handleMicToggle = () => {
        setIsListening(!isListening);
        // TODO: Implement actual voice recognition here
        // For now, we'll just toggle the visual state
        if (!isListening) {
            // Start listening
            console.log('Starting voice input...');
        } else {
            // Stop listening
            console.log('Stopping voice input...');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentMessage.trim() || isProcessing) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: currentMessage,
            timestamp: new Date()
        };

        setChatMessages(prev => [...prev, userMessage]);
        setCurrentMessage('');
        setIsProcessing(true);

        try {
            // Use AI assistant to generate response
            const ragResponse: RAGResponse = await aiAssistant.generateResponse(currentMessage);
            
            const agentResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'agent',
                content: ragResponse.answer,
                timestamp: new Date(),
                sources: ragResponse.sources
            };
            
            setChatMessages(prev => [...prev, agentResponse]);
        } catch (error) {
            console.error('Error getting AI response:', error);
            
            // Fallback to simple response
            const fallbackResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'agent',
                content: t('I\'m sorry, I\'m having trouble processing your request right now. Please try asking about specific topics like user management, SMART apps, or FHIR servers.'),
                timestamp: new Date()
            };
            
            setChatMessages(prev => [...prev, fallbackResponse]);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Floating Chat Button - only show when using internal state and chat is closed */}
            {externalIsOpen === undefined && !isOpen && (
                <div className="fixed bottom-4 right-4 z-[50]">
                    <Button
                        onClick={() => setInternalIsOpen(true)}
                        className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl border border-primary/20 transition-all duration-300 hover:scale-105"
                        title={t('Open AI Assistant')}
                    >
                        {aiAssistant.isOpenAIAvailable() ? (
                            <Brain className="w-6 h-6 text-primary-foreground" />
                        ) : (
                            <Bot className="w-6 h-6 text-primary-foreground" />
                        )}
                    </Button>
                </div>
            )}

            {/* Chat Overlay */}
            {isOpen && (
                <div className="fixed bottom-4 right-4 z-[60] w-96 max-w-[calc(100vw-2rem)]">
                    <Card className="bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/50 p-4 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
                                {aiAssistant.isOpenAIAvailable() ? (
                                    <Brain className="w-4 h-4 text-primary-foreground" />
                                ) : (
                                    <Bot className="w-4 h-4 text-primary-foreground" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <CardTitle className="text-sm font-semibold text-foreground">
                                        {t('SMART Assistant')}
                                    </CardTitle>
                                    {aiAssistant.isOpenAIAvailable() && (
                                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {aiAssistant.isOpenAIAvailable() 
                                        ? t('AI-powered with RAG knowledge base')
                                        : t('Semantic search with knowledge base')
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="h-6 w-6 p-0 hover:bg-muted rounded-md"
                                title={isMinimized ? t('Expand chat') : t('Minimize chat')}
                            >
                                <Minimize2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="h-6 w-6 p-0 hover:bg-muted rounded-md"
                                title={t('Close chat')}
                            >
                                <X className="w-3 h-3 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {!isMinimized && (
                    <CardContent className="p-0">
                        {/* Chat Messages */}
                        <div className="h-64 overflow-y-auto p-4 space-y-3">
                            {chatMessages.map((message) => (
                                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${message.type === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                                        : 'bg-muted text-foreground rounded-bl-sm'
                                        }`}>
                                        {message.type === 'agent' ? (
                                            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                        ul: ({ children }) => <ul className="ml-4 mb-2 last:mb-0 list-disc">{children}</ul>,
                                                        li: ({ children }) => <li className="mb-1">{children}</li>,
                                                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                                        em: ({ children }) => <em className="italic">{children}</em>,
                                                        code: ({ children }) => <code className="bg-muted/60 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{message.content}</div>
                                        )}
                                        
                                        
                                        {/* Show sources for agent messages */}
                                        {message.type === 'agent' && message.sources && message.sources.length > 0 && (
                                            <div className="mt-3 pt-2 border-t border-border/20">
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                                    <FileText className="w-3 h-3" />
                                                    <span>{t('Sources')}:</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {message.sources.slice(0, 3).map((source, index) => (
                                                        <div key={index} className="text-xs bg-background/50 rounded px-2 py-1 border border-border/30">
                                                            <div className="font-medium">{source.title}</div>
                                                            <div className="text-muted-foreground text-[10px]">{source.category}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            {/* Processing indicator */}
                            {isProcessing && (
                                <div className="flex justify-start">
                                    <div className="bg-muted text-foreground p-3 rounded-lg rounded-bl-sm text-sm">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            <span>{t('Assistant is thinking')}...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="border-t border-border/50 p-4">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <Input
                                    value={currentMessage}
                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                    placeholder={t('Ask me about SMART on FHIR...')}
                                    className="flex-1 text-sm rounded-lg border-input focus:border-ring focus:ring-ring"
                                    disabled={isProcessing}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleMicToggle}
                                    variant={isListening ? "destructive" : "secondary"}
                                    className={`rounded-lg px-3 transition-all duration-300 ${isListening ? 'animate-pulse' : ''}`}
                                    disabled={isProcessing}
                                    title={isListening ? t('Stop listening') : t('Start voice input')}
                                >
                                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isProcessing || !currentMessage.trim()}
                                    className={`rounded-lg px-3 transition-all duration-300 ${isProcessing ? 'animate-pulse' : ''}`}
                                    title={t('Send message')}
                                >
                                    {isProcessing ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
        )}
        </>
    );
}
