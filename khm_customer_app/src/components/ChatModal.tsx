/**
 * ChatModal — Customer App
 *
 * In-ride real-time chat between customer and driver.
 * Messages are persisted to MongoDB and relayed via Socket.io room and direct emit.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { ChatMessagePayload, emitChatMessage, getSocket, joinBookingRoom } from '../services/socket';
import { getBookingMessagesApi } from '../services/apis/booking/bookingService';
import { Colors } from '../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    isMine: boolean;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    bookingId: string;
    myId: string;
    myName: string;
    recipientId: string;
    recipientName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatModal({
    visible,
    onClose,
    bookingId,
    myId,
    myName,
    recipientId,
    recipientName,
}: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const listRef = useRef<FlatList>(null);
    const historyLoadedRef = useRef<string | null>(null);

    // Load message history from server whenever modal opens or booking changes
    const loadHistory = useCallback(async () => {
        if (!bookingId) return;
        setIsLoadingHistory(true);
        try {
            const history = await getBookingMessagesApi(bookingId);
            if (Array.isArray(history)) {
                const formatted: ChatMessage[] = history.map((m: any) => {
                    const sId = m.senderId ? (typeof m.senderId === 'object' ? m.senderId._id?.toString() || '' : m.senderId.toString()) : '';
                    return {
                        id: `${m.timestamp || Date.now()}-${sId}-${m.text}`,
                        senderId: sId,
                        senderName: m.senderName || '',
                        text: m.text,
                        timestamp: m.timestamp || Date.now(),
                        isMine: sId === (myId?.toString() || ''),
                    };
                });

                setMessages(prev => {
                    // Merge previous in-memory messages with server history, avoiding duplicates
                    const map = new Map<string, ChatMessage>();
                    formatted.forEach(item => map.set(item.id, item));
                    prev.forEach(item => {
                        if (!map.has(item.id)) map.set(item.id, item);
                    });
                    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
                });
            }
        } catch (err) {
            console.warn('[ChatModal] Failed to load message history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [bookingId, myId]);

    // When modal becomes visible, join room, register user, and load history
    useEffect(() => {
        if (!visible || !bookingId) return;

        const socket = getSocket();
        if (socket) {
            if (myId) {
                socket.emit('register' as any, myId.toString());
            }
            joinBookingRoom(bookingId);
        }

        loadHistory();
    }, [visible, bookingId, myId, loadHistory]);

    // Real-time chat message listener (active while component is mounted)
    useEffect(() => {
        if (!bookingId) return;
        const socket = getSocket();
        if (!socket) return;

        joinBookingRoom(bookingId);

        const handler = (payload: ChatMessagePayload) => {
            if (!payload || payload.bookingId !== bookingId) return;
            const sId = payload.senderId ? payload.senderId.toString() : '';
            const msgId = `${payload.timestamp}-${sId}-${payload.text}`;

            setMessages(prev => {
                // Ignore if duplicate
                if (prev.some(m => m.id === msgId || (m.timestamp === payload.timestamp && m.text === payload.text && m.senderId === sId))) {
                    return prev;
                }
                return [
                    ...prev,
                    {
                        id: msgId,
                        senderId: sId,
                        senderName: payload.senderName || '',
                        text: payload.text,
                        timestamp: payload.timestamp || Date.now(),
                        isMine: sId === (myId?.toString() || ''),
                    },
                ];
            });
        };

        socket.on('chat_message', handler);
        return () => {
            socket.off('chat_message', handler);
        };
    }, [bookingId, myId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
        }
    }, [messages]);

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !bookingId) return;

        const timestamp = Date.now();
        const msgId = `${timestamp}-${myId}-${text}`;

        // Optimistically add our own message
        const msg: ChatMessage = {
            id: msgId,
            senderId: myId ? myId.toString() : '',
            senderName: myName || 'Customer',
            text,
            timestamp,
            isMine: true,
        };
        setMessages(prev => [...prev, msg]);
        setInputText('');

        emitChatMessage(bookingId, recipientId, myId, myName, text);
    };

    const renderItem = ({ item }: { item: ChatMessage }) => (
        <View style={[styles.bubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            {!item.isMine && (
                <Text style={styles.bubbleSender}>{item.senderName || recipientName}</Text>
            )}
            <Text style={[styles.bubbleText, item.isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                {item.text}
            </Text>
            <Text style={[styles.bubbleTime, item.isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                        <Ionicons name="chevron-down" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{recipientName}</Text>
                        <Text style={styles.headerSubtitle}>Captain</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Messages List */}
                {isLoadingHistory && messages.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={Colors.light.primary} />
                        <Text style={styles.loadingText}>Loading chat…</Text>
                    </View>
                ) : messages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.light.secondaryText} style={{ opacity: 0.5 }} />
                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptySubtitle}>Send a message to your captain below.</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {/* Input Bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message…"
                        placeholderTextColor="#999"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="send" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 20 : 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        backgroundColor: Colors.light.card,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    headerInfo: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
    },
    headerSubtitle: {
        fontSize: 12,
        color: Colors.light.secondaryText,
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    loadingText: {
        fontSize: 13,
        color: Colors.light.secondaryText,
    },
    bubble: {
        maxWidth: '78%',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 9,
        marginBottom: 8,
    },
    bubbleMine: {
        alignSelf: 'flex-end',
        backgroundColor: Colors.light.primary,
        borderBottomRightRadius: 4,
    },
    bubbleTheirs: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.light.card ?? '#F3F4F6',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: Colors.light.border ?? '#E5E7EB',
    },
    bubbleSender: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.light.primaryDark ?? '#1E3A8A',
        marginBottom: 3,
    },
    bubbleText: {
        fontSize: 15,
        lineHeight: 20,
    },
    bubbleTextMine: {
        color: '#FFFFFF',
    },
    bubbleTextTheirs: {
        color: Colors.light.text,
    },
    bubbleTime: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    bubbleTimeMine: {
        color: 'rgba(255, 255, 255, 0.75)',
    },
    bubbleTimeTheirs: {
        color: Colors.light.secondaryText,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
        backgroundColor: Colors.light.card,
        gap: 8,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        fontSize: 15,
        color: Colors.light.text,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        opacity: 0.4,
    },
});
