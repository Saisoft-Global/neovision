import { NodeExecutor } from '../executors/NodeExecutor';
import { FileOperationConfig, FileOperationResult } from './types';
import { FileProcessor } from './processors/FileProcessor';
import { DocumentTransformer } from './processors/DocumentTransformer';

export class FileSystemNodeExecutor extends NodeExecutor<FileOperationConfig> {
  private fileProcessor: FileProcessor;
  private documentTransformer: DocumentTransformer;

  constructor() {
    super();
    this.fileProcessor = new FileProcessor();
    this.documentTransformer = new DocumentTransformer();
  }

  async execute(config: FileOperationConfig): Promise<FileOperationResult> {
    try {
      switch (config.operation) {
        case 'read':
          return await this.fileProcessor.readFile(config.path);
        case 'write':
          return await this.fileProcessor.writeFile(config.path, config.content!);
        case 'delete':
          return await this.fileProcessor.deleteFile(config.path);
        case 'move':
          return await this.fileProcessor.moveFile(config.path, config.destination!);
        case 'transform':
          return await this.documentTransformer.transform(config.path, config.options || {});
        default:
          throw new Error(`Unsupported file operation: ${config.operation}`);
      }
    } catch (error) {
      console.error('File system operation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}