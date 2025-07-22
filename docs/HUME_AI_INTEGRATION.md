# Hume AI Integration Guide

## 🧠 Overview

Zyglio now integrates with **Hume AI's Emotional Voice Intelligence (EVI)** to provide emotionally aware voice conversations. This integration replaces the previous ElevenLabs implementation with a more sophisticated system that understands both what users say and how they feel.

## ✨ Features

- **Emotional Intelligence**: Real-time emotion recognition from voice
- **Natural Conversations**: Voice-to-voice interactions with natural turn-taking
- **Empathetic Responses**: AI that responds based on emotional context
- **Real-time Processing**: Low-latency voice processing and response
- **Adaptive Behavior**: AI adjusts its responses based on user's emotional state

## 🚀 Setup Instructions

### 1. Get Hume AI API Keys

1. Sign up at [Hume AI Developer Portal](https://dev.hume.ai/)
2. Create a new project
3. Get your API Key and Secret Key from the dashboard
4. Note: You'll need both the API Key and Secret Key for full functionality

### 2. Environment Configuration

Add the following to your `.env` file:

```env
# Hume AI Configuration (Required for voice chat demo)
HUME_API_KEY=your_hume_api_key_here
HUME_SECRET_KEY=your_hume_secret_key_here
NEXT_PUBLIC_HUME_API_KEY=your_hume_api_key_here
```

**Important**: The `NEXT_PUBLIC_HUME_API_KEY` is used for client-side WebSocket connections, while `HUME_API_KEY` and `HUME_SECRET_KEY` are used for server-side API calls.

### 3. Install Dependencies

The Hume AI SDK is already included in the project:

```bash
npm install hume
```

## 🎯 Usage

### Live Demo

1. Navigate to `/demo` in your application
2. Click "Start Voice Conversation"
3. Allow microphone permissions when prompted
4. Speak naturally with the AI assistant
5. The AI will respond with voice and show detected emotions

### Key Components

#### 1. `HumeVoiceChat` Component
- **Location**: `src/components/hume-voice-chat.tsx`
- **Purpose**: Main voice chat interface with Hume AI
- **Features**: Real-time emotion display, conversation history, audio controls

#### 2. API Routes
- **Prompts**: `src/app/api/hume/prompts/route.ts`
- **Config**: `src/app/api/hume/config/route.ts`
- **Purpose**: Manage Hume AI configurations and system prompts

## 🔧 Configuration Options

### System Prompt

The AI assistant uses a specialized prompt for educational interviews:

```typescript
const systemPrompt = `You are an expert AI interview assistant for Zyglio's voice-to-mastery training platform.

Key behaviors:
- If the user sounds nervous, be more encouraging and supportive
- If the user sounds confident, ask more challenging questions  
- If the user sounds confused, provide clearer explanations
- Always acknowledge the user's emotional state when appropriate
- Keep responses concise but meaningful
- Always encourage further discussion and learning

Remember: You have access to real-time emotion analysis, so use this information to make your responses more empathetic and effective.`;
```

### Voice Configuration

```typescript
const voiceConfig = {
  provider: "HUME_AI",
  name: "ITO" // Hume's default voice
};
```

## 📊 Emotion Recognition

The integration provides real-time emotion scores for:

- **Admiration** - Appreciation or respect
- **Adoration** - Love or worship
- **Aesthetic Appreciation** - Beauty recognition
- **Amusement** - Entertainment or humor
- **Anger** - Irritation or rage
- **Anxiety** - Worry or nervousness
- **Awe** - Wonder or amazement
- **Awkwardness** - Social discomfort
- **Boredom** - Lack of interest
- **Calmness** - Peace or tranquility
- **Concentration** - Focus or attention
- **Confusion** - Uncertainty or bewilderment
- **Contemplation** - Deep thought
- **Contentment** - Satisfaction
- **Craving** - Desire or longing
- **Determination** - Resolve or persistence
- **Disappointment** - Unfulfilled expectations
- **Disgust** - Revulsion or distaste
- **Distress** - Suffering or pain
- **Doubt** - Uncertainty or skepticism
- **Ecstasy** - Intense joy
- **Embarrassment** - Shame or awkwardness
- **Empathic Pain** - Shared suffering
- **Entrancement** - Fascination
- **Envy** - Jealousy
- **Excitement** - Enthusiasm
- **Fear** - Apprehension or terror
- **Guilt** - Responsibility for wrongdoing
- **Horror** - Intense fear or shock
- **Interest** - Curiosity
- **Joy** - Happiness
- **Love** - Deep affection
- **Nostalgia** - Sentimental longing
- **Pain** - Physical or emotional hurt
- **Pride** - Self-satisfaction
- **Realization** - Understanding
- **Relief** - Comfort after distress
- **Romance** - Romantic love
- **Sadness** - Sorrow
- **Satisfaction** - Contentment
- **Shame** - Humiliation
- **Surprise (negative)** - Unpleasant shock
- **Surprise (positive)** - Pleasant shock
- **Sympathy** - Compassion
- **Tiredness** - Fatigue
- **Triumph** - Victory or success

## 🛠️ Troubleshooting

### Common Issues

1. **"Hume API key not found"**
   - Ensure your `.env` file has the correct Hume AI keys
   - Check that `NEXT_PUBLIC_HUME_API_KEY` is set for client-side access

2. **WebSocket connection fails**
   - Verify your API key is valid and active
   - Check network connectivity and firewall settings
   - Ensure you have sufficient API quota

3. **Microphone not working**
   - Check browser permissions for microphone access
   - Ensure HTTPS is enabled for production deployments
   - Test microphone with other applications

4. **No audio playback**
   - Check browser audio permissions
   - Verify speakers/headphones are working
   - Check browser console for audio errors

### Debug Mode

Enable debug mode by setting:

```javascript
process.env.NODE_ENV = 'development'
```

This will show additional debugging information in the component.

## 📈 Performance Tips

1. **Audio Quality**: Use a good quality microphone for better emotion recognition
2. **Network**: Ensure stable internet connection for real-time processing  
3. **Browser**: Use modern browsers (Chrome, Firefox, Safari) for best compatibility
4. **Environment**: Test in quiet environments for better speech recognition

## 🔐 Security Considerations

- **API Keys**: Never expose secret keys in client-side code
- **HTTPS**: Always use HTTPS in production for WebSocket connections
- **Permissions**: Request microphone permissions explicitly
- **Data**: Voice data is processed by Hume AI according to their privacy policy

## 📚 Additional Resources

- [Hume AI Documentation](https://dev.hume.ai/docs)
- [EVI API Reference](https://dev.hume.ai/reference/speech-to-speech-evi)
- [Emotion Recognition Guide](https://dev.hume.ai/docs/speech-to-speech-evi/features)
- [WebSocket API](https://dev.hume.ai/reference/speech-to-speech-evi/chat/chat)

## 🤝 Support

For technical issues:
1. Check the browser console for error messages
2. Verify API key configuration
3. Test with a simple voice message first
4. Contact Hume AI support for API-related issues

## 🔄 Migration from ElevenLabs

If you're migrating from the previous ElevenLabs integration:

1. **Remove ElevenLabs dependencies** (optional, kept for compatibility)
2. **Update environment variables** with Hume AI keys
3. **Test the new demo interface** at `/demo`
4. **Update any custom implementations** to use the new `HumeVoiceChat` component

The new integration provides superior emotional intelligence and more natural conversations while maintaining the same user interface patterns. 