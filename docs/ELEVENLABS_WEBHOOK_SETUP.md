# ElevenLabs Webhook Setup for Automatic Transcript Scoring

This guide will help you set up ElevenLabs webhooks to automatically score voice certification conversations and update user certification status.

## 🎯 What This Enables

- **Automatic Scoring**: Full conversation transcripts are analyzed for basketball knowledge
- **Real-time Results**: Certification status updated immediately after conversation ends
- **Detailed Analytics**: Conversation breakdown stored for review and improvement
- **Pass/Fail Logic**: Automated scoring with 70% passing threshold

## 📋 Prerequisites

1. ElevenLabs account with your basketball agent (`agent_01jzk7f85fedsssv51bkehfmg5`)
2. Public webhook endpoint (use ngrok for local development)
3. Your app running on a publicly accessible URL

## 🚀 Step 1: Create Webhook Endpoint (Already Done)

The webhook endpoint has been created at:
```
POST /api/elevenlabs/webhook
```

This endpoint:
- ✅ Validates ElevenLabs webhook signatures
- ✅ Processes conversation transcripts
- ✅ Scores basketball knowledge across 4 categories
- ✅ Updates certification status in database
- ✅ Stores detailed analytics

## 🔗 Step 2: Expose Your Local Server (Development)

### Option A: Using ngrok (Recommended)

1. **Install ngrok**: Download from [ngrok.com](https://ngrok.com)

2. **Start your app**:
   ```bash
   npm run dev
   ```

3. **Expose port 3000**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the public URL** (e.g., `https://abc123.ngrok.io`)

### Option B: Using localtunnel

1. **Install localtunnel**:
   ```bash
   npm install -g localtunnel
   ```

2. **Expose port 3000**:
   ```bash
   lt --port 3000
   ```

## ⚙️ Step 3: Configure ElevenLabs Webhook

1. **Go to ElevenLabs Dashboard**:
   - Navigate to [ElevenLabs Settings](https://elevenlabs.io/app/settings)
   - Go to "Webhooks" section

2. **Create New Webhook**:
   - Click "Add Webhook"
   - **URL**: `https://your-domain.com/api/elevenlabs/webhook`
     - For ngrok: `https://abc123.ngrok.io/api/elevenlabs/webhook`
   - **Events**: Select "Post-call transcription" (`post_call_transcription`)
   - **Authentication**: Enable HMAC signature validation

3. **Copy Webhook Secret**:
   - After creating, copy the generated webhook secret
   - Add to your `.env.local`:
     ```env
     ELEVENLABS_WEBHOOK_SECRET="your_webhook_secret_here"
     ```

4. **Test Webhook**:
   - ElevenLabs provides a "Test" button to verify your endpoint

## 🏀 Step 4: Basketball Scoring Criteria

The webhook automatically scores conversations based on:

### Fundamentals (30% weight)
- Keywords: dribble, shoot, pass, defense, rebound, layup, free throw
- Minimum: 3 mentions required

### Strategy (25% weight) 
- Keywords: play, strategy, position, team, coach, game plan, offense, screen
- Minimum: 2 mentions required

### Rules (25% weight)
- Keywords: foul, violation, rules, referee, technical, personal foul, traveling  
- Minimum: 2 mentions required

### Engagement (20% weight)
- Minimum: 5 conversation turns
- Minimum: 60 seconds duration

**Passing Score**: 70% or higher

## 🧪 Step 5: Test the Integration

1. **Start a voice certification**:
   ```
   http://localhost:3000/certification/74519935-15d2-4fe1-80cb-4444e05e1d24
   ```

2. **Have a basketball conversation**:
   - Discuss basketball fundamentals (shooting, dribbling, passing)
   - Talk about game strategy and positions
   - Mention rules and violations
   - Keep the conversation engaging (5+ turns, 60+ seconds)

3. **End the conversation** and check:
   - Browser console for webhook logs
   - Database for new certification record
   - ElevenLabs dashboard for webhook delivery status

## 📊 Step 6: Monitor Results

### Database Changes
The webhook updates the `Certification` table with:
- `voiceInterviewScore`: Overall percentage score
- `voiceInterviewData`: Full transcript and scoring breakdown
- `competencyScores`: Detailed scoring by category
- `passed`: Boolean based on 70% threshold
- `certifiedAt`: Timestamp if passed

### Logs to Monitor
```bash
# In your terminal running the app:
🎯 ElevenLabs webhook received
📝 Processing transcript for conversation: conv_abc123
📊 Call duration: 45 seconds
💬 Transcript turns: 8
🏀 Basketball certification scoring: { score: 78, passed: true }
✅ Certification created: cert_xyz789
```

## 🐛 Troubleshooting

### Webhook Not Receiving Data
1. **Check ngrok tunnel**: Ensure it's still running
2. **Verify webhook URL**: Must be publicly accessible
3. **Check ElevenLabs logs**: Dashboard shows delivery attempts
4. **Test endpoint manually**:
   ```bash
   curl -X POST https://your-domain.com/api/elevenlabs/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}'
   ```

### Signature Validation Failing
1. **Check webhook secret**: Must match ElevenLabs dashboard
2. **Verify environment variable**: Restart app after adding `ELEVENLABS_WEBHOOK_SECRET`
3. **Disable validation temporarily** for testing (comment out validation in webhook)

### Database Errors
1. **Missing moduleId/procedureId**: Ensure training module exists
2. **User not found**: Check user authentication
3. **Duplicate certification**: The webhook handles updates automatically

### Scoring Issues
1. **Low scores**: Have longer conversations with more basketball terms
2. **No dynamic variables**: Check that user info is passed correctly in conversation start
3. **Missing transcript**: Ensure conversation has both agent and user messages

## 🔒 Production Deployment

For production deployment:

1. **Use your production domain** instead of ngrok
2. **Set up proper SSL certificate** 
3. **Configure webhook URL** to production endpoint
4. **Set production environment variables**
5. **Monitor webhook delivery** in ElevenLabs dashboard
6. **Set up logging and error tracking**

## 📈 Advanced Configuration

### Custom Scoring Criteria
Edit `src/app/api/elevenlabs/webhook/route.ts` to modify:
- Keywords for each category
- Scoring weights
- Passing threshold
- Feedback messages

### Multiple Agent Support
The webhook can handle multiple agents by:
- Adding agent-specific scoring criteria
- Using `agent_id` from webhook data
- Creating different certification types

### Enhanced Analytics
Store additional data in `voiceInterviewData`:
- Conversation sentiment analysis
- Speaking time ratios
- Interruption patterns
- Response latency

## 🎉 Success!

Once configured, users will:
1. Start voice certification ➡️ 
2. Have conversation with Coach Alex ➡️ 
3. End conversation ➡️ 
4. **Automatically receive certification results!**

The webhook eliminates manual scoring and provides immediate feedback based on comprehensive conversation analysis. 