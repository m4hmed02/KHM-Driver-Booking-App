/**
 * ChatModal — Driver App
 *
 * In-ride real-time chat between driver and customer.
 * Messages are relayed via the backend socket server.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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
                    const map = new Map<string, ChatMessage>();
                    formatted.forEach(item => map.set(item.id, item));
                    prev.forEach(item => {
                        if (!map.has(item.id)) map.set(item.id, item);
                    });
                    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
                });
            }
        } catch (err) {
            console.warn('[DriverChatModal] Failed to load message history:', err);
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

    // Real-time chat message listener
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
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
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
            senderName: myName || 'Driver',
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
                    <View style={styles.headerCenter}>
                        <View style={styles.avatarCircle}>
                            <Ionicons name="person" size={18} color={Colors.light.primaryDark} />
                        </View>
                        <View>
                            <Text style={styles.headerName}>{recipientName}</Text>
                            <Text style={styles.headerSub}>In-ride chat</Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Messages */}
                {isLoadingHistory && messages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="small" color={Colors.light.primary} />
                        <Text style={styles.emptyText}>Loading chat…</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.messageList}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="chatbubbles-outline" size={40} color={Colors.light.border} />
                                <Text style={styles.emptyText}>No messages yet.{'\n'}Say hi! 👋</Text>
                            </View>
                        }
                    />
                )}

                {/* Input bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message…"
                        placeholderTextColor={Colors.light.secondaryText}
                        multiline
                        maxLength={500}
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
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
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.light.background,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 3,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.light.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
    },
    headerSub: {
        fontSize: 11,
        color: Colors.light.secondaryText,
        marginTop: 1,
    },
    messageList: {
        padding: 16,
        gap: 10,
        flexGrow: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.light.secondaryText,
        textAlign: 'center',
        lineHeight: 22,
    },
    bubble: {
        maxWidth: '78%',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginVertical: 3,
    },
    bubbleMine: {
        alignSelf: 'flex-end',
        backgroundColor: Colors.light.primary,
        borderBottomRightRadius: 4,
    },
    bubbleTheirs: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.light.background,
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    bubbleSender: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.light.secondaryText,
        marginBottom: 3,
    },
    bubbleText: {
        fontSize: 15,
        lineHeight: 21,
    },
    bubbleTextMine: {
        color: '#fff',
    },
    bubbleTextTheirs: {
        color: Colors.light.text,
    },
    bubbleTime: {
        fontSize: 10,
        marginTop: 4,
    },
    bubbleTimeMine: {
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'right',
    },
    bubbleTimeTheirs: {
        color: Colors.light.secondaryText,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        backgroundColor: Colors.light.background,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
    },
    input: {
        flex: 1,
        minHeight: 42,
        maxHeight: 100,
        backgroundColor: '#F5F7FA',
        borderRadius: 21,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: Colors.light.text,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        opacity: 0.4,
    },
});
