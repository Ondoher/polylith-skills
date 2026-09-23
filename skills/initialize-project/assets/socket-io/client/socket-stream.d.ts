/** Public registry contract implemented by the client Socket.IO stream service. */
interface SocketStreamService extends EventBus {
	/** Call this method to resolve and materialize an application-prefixed namespace. @param name - The namespace name. @returns - The normalized namespace. */
	namespace(name: string): string;
	/** Call this method to subscribe to immutable event-envelope data. @param name - The namespace name. @param event - The event name. @param listener - The event consumer. @returns - A function that removes the listener. */
	on<T>(name: string, event: string, listener: (data: T, system: SocketSystemData) => void): () => void;
	/** Call this method to remove an exact event listener. @param name - The namespace name. @param event - The event name. @param listener - The original consumer. @returns - Whether a listener was removed. */
	off(name: string, event: string, listener: (...args: unknown[]) => void): boolean;
	/** Call this method to emit an immutable data envelope without acknowledgement. @param name - The namespace name. @param event - The event name. @param data - The application payload. @returns - Whether the event was emitted. */
	send<T>(name: string, event: string, data: T): boolean;
	/** Call this method to emit an acknowledged request. @param name - The namespace name. @param event - The event name. @param data - The request payload. @param options - Optional timeout configuration. @returns - The response envelope. */
	request<TRequest, TResponse>(name: string, event: string, data: TRequest, options?: SocketRequestOptions): Promise<SocketResponse<TResponse>>;
	/** Call this method to disconnect and forget one namespace. @param name - The namespace name. @returns - Whether a namespace was closed. */
	closeNamespace(name: string): boolean;
	/** Call this method to disconnect and forget every namespace. */
	stop(): void;
}
