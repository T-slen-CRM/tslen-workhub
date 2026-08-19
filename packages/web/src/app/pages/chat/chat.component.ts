import {Component, OnInit, OnDestroy, input, effect, inject} from '@angular/core';
import { Subscription } from 'rxjs';
import {ChatService} from "./chat.service";
import {FormsModule} from "@angular/forms";
import {DatePipe, NgForOf, NgIf} from "@angular/common";
import {ToastrService} from "ngx-toastr";
import { TranslateModule } from '@ngx-translate/core';

const MESSAGE_PREVIEW_LENGTH = 60;

// Interface for messages to display in the UI
interface DisplayMessage {
  id?: string;
  senderId: string;
  content: string;
  timestamp: Date; // Convert ISO string to Date object for display
  isMine: boolean;
  senderName?: string;
}

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss'],
    imports: [
        FormsModule,
        DatePipe,
        NgIf,
        NgForOf,
        TranslateModule
    ]
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: DisplayMessage[] = [];
  newMessageContent: string = '';
  chatRoomId = input<string>(''); // Input property for chat room ID
  localUserId = input<number>(null); // Input property for chat room ID
  senderName = input<string>(''); // Display name of the other participant, for notifications
  isConnected: boolean = false;
  errorMessage: string = '';

  private subscriptions: Subscription = new Subscription();
  private toastr = inject(ToastrService);

  constructor(private chatService: ChatService) {
    this.chatService.listenForEvents(this.chatRoomId(), +this.localUserId());
    // For demonstration: get user ID from the service itself
    // In a real app, this would come from an auth service or login process.
    // Ensure this matches what you set in the service for the socket connection

    effect(() => {
        if (this.chatRoomId()){
          // this.chatService.disconnect(); // Ensure previous connection is closed
          this.chatService.listenForEvents(this.chatRoomId(), +this.localUserId());
        }

    });
  }


  ngOnInit(): void {
    // Subscribe to connection status
    this.subscriptions.add(
      this.chatService.getConnectedStatus().subscribe((status) => {
        this.isConnected = status;
        if (status) {
        } else {
          console.warn('Chat connection is DOWN!');
        }
      })
    );

    // Subscribe to errors
    this.subscriptions.add(
      this.chatService.getErrors().subscribe((error) => {
        this.errorMessage = error;
      })
    );

    // Subscribe to chat history
    this.subscriptions.add(
      this.chatService.getChatHistory().subscribe((history) => {
        this.messages = history.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp), // Convert to Date object
          isMine: +msg.senderId === this.localUserId(),
        }));
        this.scrollToBottom();
      })
    );

    // Subscribe to new real-time messages
    this.subscriptions.add(
      this.chatService.getMessages().subscribe((message) => {
        // Play a sound and, if the tab isn't in focus, show a toast for messages from the other person
        if (+message.senderId !== this.localUserId()) {
          const audio = new Audio('assets/audio/join.mp3');
          audio.play().catch(() => {}); // autoplay can be blocked by the browser; sound is a nice-to-have
          if (document.hidden) {
            this.notifyNewMessage(message.content);
          }
        }
        this.messages.push({
          ...message,
          timestamp: new Date(message.timestamp), // Convert to Date object
          isMine: +message.senderId === this.localUserId(),
        });
        this.scrollToBottom();
      })
    );
  }

  // Method to send a new message
  sendMessage(): void {
    if (this.newMessageContent.trim() && this.chatRoomId()) {
      this.chatService.sendMessage(this.chatRoomId(), this.newMessageContent.trim());
      this.newMessageContent = ''; // Clear input field
      this.errorMessage = ''; // Clear any previous errors
    } else {
      this.errorMessage = 'Message content or chat room cannot be empty.';
    }
  }

  // Show a toast for a message that arrived while the tab wasn't in focus
  private notifyNewMessage(content: string): void {
    const preview = content.length > MESSAGE_PREVIEW_LENGTH
      ? content.slice(0, MESSAGE_PREVIEW_LENGTH) + '…'
      : content;
    this.toastr.info(preview, this.senderName() || 'New message');
  }

  // Utility to scroll to the bottom of the message list
  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 0); // Use setTimeout to ensure DOM updates before scrolling
  }

  // Unsubscribe from all subscriptions when the component is destroyed
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.chatService.disconnect(); // Disconnect socket when component is destroyed
  }
}
