/**
 * The chat message shape as it actually crosses the socket, both ways:
 * - `chatHistory` (persisted, from Message) always has `id`.
 * - the live `message` broadcast is emitted before the message is
 *   persisted (so the DB-generated id doesn't exist yet), hence `id`
 *   being optional here rather than a second near-identical type.
 * `timestamp` is a string because that's what actually goes over the
 * wire - Socket.IO serializes a Date to its ISO string on the way out.
 */
export interface ChatMessage {
  id?: string;
  senderId: string;
  chatRoomId: string;
  content: string;
  timestamp: string;
}
