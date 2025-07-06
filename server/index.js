import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const serviceAccount = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER,
  client_x509_cert_url: process.env.CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();
const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'https://pesananonim-*.vercel.app',
    'https://pesananonim-db9hw4wki-naufal-maulanas-projects-f8354363.vercel.app'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// API Endpoints with improved error handling
app.get('/api/messages', async (req, res) => {
  try {
    const snapshot = await db.collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const messages = [];
    snapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(messages);
  } catch (error) {
    console.error('Firestore Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load messages',
      details: error.message
    });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message must be a string'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 500 chars)'
      });
    }

    const newMessage = {
      message: message.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ip: req.ip
    };

    const docRef = await db.collection('messages').add(newMessage);
    
    res.status(201).json({
      success: true,
      id: docRef.id
    });
  } catch (error) {
    console.error('Firestore Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Firebase connected to project: ${process.env.PROJECT_ID}`);
});
