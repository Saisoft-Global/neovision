export abstract class NodeExecutor<T> {
  abstract execute(config: T): Promise<unknown>;

  protected async validateParameters(config: T): Promise<void> {
    // Implement parameter validation logic
  }

  protected handleError(error: Error): never {
    console.error('Node execution error:', error);
    throw error;
  }
}