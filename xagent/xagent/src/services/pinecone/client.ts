import { PineconeClient } from './PineconeClient';

// Export the client instance and utility functions
export const pineconeClient = PineconeClient;
export const getVectorIndex = () => PineconeClient.getIndex();
export const vectorStore = PineconeClient; // Add direct vectorStore export
export const getPineconeError = () => PineconeClient.getInitializationError();
export const resetPinecone = () => PineconeClient.reset();

// Maintain backward compatibility
export const getVectorStore = getVectorIndex;