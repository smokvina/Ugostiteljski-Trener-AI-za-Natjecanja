export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  image?: string;
}

export interface FilePart {
  data: string; // base64 encoded
  mimeType: string;
}

export interface SendMessagePayload {
  text: string;
  file?: FilePart;
}
