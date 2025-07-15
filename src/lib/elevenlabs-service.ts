// ElevenLabs API integration service
// Note: In production, you would need to add your ElevenLabs API key to environment variables
const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
const AGENT_ID = "agent_01k011w3b9epzb3eg4vjqjfn8v";

export interface ElevenLabsMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ElevenLabsSession {
  session_id: string;
  agent_id: string;
}

export class ElevenLabsService {
  private static baseUrl = 'https://api.elevenlabs.io/v1';

  static async createSession(): Promise<ElevenLabsSession> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${AGENT_ID}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          // Add any session configuration here
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        session_id: data.session_id,
        agent_id: AGENT_ID,
      };
    } catch (error) {
      console.error('Error creating ElevenLabs session:', error);
      throw error;
    }
  }

  static async sendAudioMessage(sessionId: string, audioBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('session_id', sessionId);

      const response = await fetch(`${this.baseUrl}/agents/${AGENT_ID}/sessions/${sessionId}/audio`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to send audio message: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || 'No response received';
    } catch (error) {
      console.error('Error sending audio message:', error);
      throw error;
    }
  }

  static async sendTextMessage(sessionId: string, message: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${AGENT_ID}/sessions/${sessionId}/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send text message: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || 'No response received';
    } catch (error) {
      console.error('Error sending text message:', error);
      throw error;
    }
  }

  static async getSessionHistory(sessionId: string): Promise<ElevenLabsMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${AGENT_ID}/sessions/${sessionId}/history`, {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get session history: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error getting session history:', error);
      throw error;
    }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${AGENT_ID}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  // Helper method to convert audio blob to base64 (if needed)
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Helper method to check if API key is configured
  static isConfigured(): boolean {
    return !!ELEVENLABS_API_KEY;
  }
}

// Demo mode service for when API key is not configured
export class DemoElevenLabsService {
  private static sessionId: string | null = null;

  static async createSession(): Promise<ElevenLabsSession> {
    this.sessionId = `demo-session-${Date.now()}`;
    return {
      session_id: this.sessionId,
      agent_id: AGENT_ID,
    };
  }

  static async sendAudioMessage(sessionId: string, audioBlob: Blob): Promise<string> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return simulated responses based on session
    const responses = [
      "That's a great point! Can you tell me more about a challenging situation you've faced in your previous role and how you handled it?",
      "I appreciate your answer. What would you say is your greatest professional achievement?",
      "Interesting perspective. How do you handle working under pressure or tight deadlines?",
      "That's very insightful. What are your long-term career goals?",
      "Thank you for sharing that. How do you stay updated with industry trends and new technologies?",
    ];
    
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }

  static async sendTextMessage(sessionId: string, message: string): Promise<string> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "I understand your message. In a real implementation, I would process your text and provide a contextual response based on the ElevenLabs agent's training.";
  }

  static async getSessionHistory(sessionId: string): Promise<ElevenLabsMessage[]> {
    return [
      {
        role: 'assistant',
        content: "Hello! I'm your AI interview assistant. I'm here to help you practice for your upcoming interview. Are you ready to begin?"
      }
    ];
  }

  static async deleteSession(sessionId: string): Promise<void> {
    this.sessionId = null;
  }

  static isConfigured(): boolean {
    return false; // Always false for demo mode
  }
} 