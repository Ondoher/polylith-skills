/** Public registry contract implemented by the server Socket.IO stream service. */
interface SocketStreamService extends EventBus {
	/** Call this method to attach the Polylith-provided Socket.IO server. @param io - The configured server. */
	setup(io: unknown): void;
	/** Call this method to register or resolve an application-prefixed namespace. @param name - The namespace name. @returns - The normalized namespace. */
	namespace(name: string): string;
	/** Call this method to register a request handler for future and connected sockets. @param name - The namespace name. @param event - The request event. @param handler - The feature handler. @returns - A function that removes the handler. */
	register<TRequest, TResponse>(name: string, event: string, handler: (context: SocketRequestContext<TRequest>) => SocketHandlerResult<TResponse> | Promise<SocketHandlerResult<TResponse>>): () => void;
	/** Call this method to remove an exact request handler. @param name - The namespace name. @param event - The request event. @param handler - The original handler. @returns - Whether a handler was removed. */
	unregister(name: string, event: string, handler: (...args: unknown[]) => unknown): boolean;
	/** Call this method to send an immutable envelope to one connected client. @param name - The namespace name. @param clientId - The client identifier. @param event - The event name. @param data - The application payload. @returns - Whether the event was emitted. */
	send<T>(name: string, clientId: string, event: string, data: T): boolean;
	/** Call this method to broadcast an immutable envelope to a namespace. @param name - The namespace name. @param event - The event name. @param data - The application payload. @returns - Whether the event was emitted. */
	broadcast<T>(name: string, event: string, data: T): boolean;
	/** Call this method to detach the transport and discard namespace registrations. */
	close(): void;
}
