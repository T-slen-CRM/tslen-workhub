import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import {ConfigurationService} from "../../services/ConfigurationService";

// Define interfaces for message types
interface OutgoingChatMessage {
  chatRoomId: string;
  content: string;
}

interface IncomingChatMessage {
  id?: string; // Optional, server might assign it
  senderId: string;
  chatRoomId: string;
  content: string;
  timestamp: string; // ISO string
}

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private socket: Socket;
  private messageSubject: Subject<IncomingChatMessage> = new Subject<IncomingChatMessage>();
  private chatHistorySubject: Subject<IncomingChatMessage[]> = new Subject<IncomingChatMessage[]>();
  private connectedSubject: Subject<boolean> = new Subject<boolean>();
  private errorSubject: Subject<string> = new Subject<string>();

  constructor(
      private configService: ConfigurationService
  ) {
    // You would typically get userId and chatRoomId from an authentication service
    // or routing parameters. For this example, hardcoding for demonstration.

    //   const apiHost = configService.getApiHost();

    // // Initialize the WebSocket connection
    // this.socket = io(apiHost + '/chat', {
    //   query: {
    //     userId: userId,
    //     chatRoomId: chatRoomId,
    //   },
    //   transports: ['websocket'], // Prefer WebSocket transport
    // });

    // this.listenForEvents();
  }

  protected createSocket(url: string, options: Parameters<typeof io>[1]): Socket {
    return io(url, options);
  }

  // Set up listeners for various Socket.IO events
  public listenForEvents(chatRoomId: string, userId: number): void {
    if (this.socket) {
      // Tear down the previous connection so it stops delivering events
      // before a new one is opened, otherwise both stay live and every
      // broadcast message gets delivered (and rendered) once per socket.
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    //  const userId = 'angular_user_' + Math.random().toString(36).substring(7); // Dynamic user ID
    // const chatRoomId = 'general'; // Default room
    const jwtToken = localStorage.getItem("jwtToken");
    const url = this.configService.getApiHost(false);
    const socketOptions = {
      extraHeaders: {
        authorization: 'Bearer ' + jwtToken,
      },
      query: {
        userId: userId,
        chatRoomId: chatRoomId,
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      //withCredentials: true,
    };
    this.socket = this.createSocket(url + '/chat', socketOptions);
    // add params to socket connection
    // this.socket.io.opts.query = {
    //   userId: userId,
    //   chatRoomId: chatRoomId,
    // };
    this.socket.on('connect', () => {
      this.connectedSubject.next(true);
      this.errorSubject.next(''); // Clear any previous errors
    });

    this.socket.on('disconnect', (reason) => {
      this.connectedSubject.next(false);
      this.errorSubject.next(`Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      this.errorSubject.next(`Connection error: ${err.message}`);
    });

    this.socket.on('error', (errorMessage: string) => {
      console.error('Server error:', errorMessage);
      this.errorSubject.next(`Server error: ${errorMessage}`);
    });

    this.socket.on('message', (message: IncomingChatMessage) => {
      this.messageSubject.next(message);
    });

    this.socket.on('chatHistory', (history: IncomingChatMessage[]) => {
      this.chatHistorySubject.next(history);
    });

    // You can add more listeners for events like 'userJoined', 'userLeft', 'messageAcknowledged', etc.
  }

  // --- Public methods for components to interact with ---

  // Get observables for events
  getMessages(): Observable<IncomingChatMessage> {
    return this.messageSubject.asObservable();
  }

  getChatHistory(): Observable<IncomingChatMessage[]> {
    return this.chatHistorySubject.asObservable();
  }

  getConnectedStatus(): Observable<boolean> {
    return this.connectedSubject.asObservable();
  }

  getErrors(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  // Send a message to the server
  sendMessage(chatRoomId: string, content: string): void {
    if (this.socket.connected) {
      const message: OutgoingChatMessage = { chatRoomId, content };
      this.socket.emit('sendMessage', message);
    } else {
      console.warn('Socket not connected. Cannot send message.');
      this.errorSubject.next('Not connected to chat server. Please refresh or check connection.');
    }
  }

  // Manual connect (if needed, though auto-connect is default)
  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  // Manual disconnect
  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  // Important: Clean up WebSocket connection on service destruction
  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.messageSubject.complete();
    this.chatHistorySubject.complete();
    this.connectedSubject.complete();
    this.errorSubject.complete();
  }
}
