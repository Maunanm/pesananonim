const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const rateLimit = require('express-rate-limit');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pesananonim-9666e.firebaseio.com"
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Terlalu banyak permintaan. Coba lagi nanti.'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../public'));
app.use(limiter);

// API Endpoints
app.post('/api/messages', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Pesan harus berupa teks' });
    }
    
    if (message.length > 500) {
      return res.status(400).json({ error: 'Pesan maksimal 500 karakter' });
    }

    const newMessage = {
      message: message.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ip: req.ip // Untuk deteksi spam
    };

    await db.collection('messages').add(newMessage);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan' });
  }
});

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
    console.error('Error:', error);
    res.status(500).json({ error: 'Gagal memuat pesan' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});