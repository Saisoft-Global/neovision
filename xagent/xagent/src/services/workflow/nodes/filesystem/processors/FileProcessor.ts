import { FileOperationResult } from '../types';

export class FileProcessor {
  async readFile(path: string): Promise<FileOperationResult> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }
      const content = await response.text();
      return { success: true, data: content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file',
      };
    }
  }

  async writeFile(path: string, content: string): Promise<FileOperationResult> {
    try {
      const response = await fetch(path, {
        method: 'PUT',
        body: content,
      });
      if (!response.ok) {
        throw new Error(`Failed to write file: ${response.statusText}`);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write file',
      };
    }
  }

  async deleteFile(path: string): Promise<FileOperationResult> {
    try {
      const response = await fetch(path, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      };
    }
  }

  async moveFile(source: string, destination: string): Promise<FileOperationResult> {
    try {
      const content = await this.readFile(source);
      if (!content.success) {
        throw new Error(content.error);
      }
      const writeResult = await this.writeFile(destination, content.data as string);
      if (!writeResult.success) {
        throw new Error(writeResult.error);
      }
      await this.deleteFile(source);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move file',
      };
    }
  }
}