const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001; // cPanel-এ রান করার সময় পোর্ট অটোমেটিক সেট হতে পারে
const NODE_ENV = process.env.NODE_ENV || 'production'; // হোস্টিংয়ের জন্য ডিফল্ট 'production' করে দেওয়া ভালো[cite: 1]

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(cookieParser());
app.use(passport.initialize());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const { apiLimiter } = require('./middleware/rateLimit');
app.use('/api', apiLimiter);

// Visitor logging (fire-and-forget, skip API/static)
const visitLog = require('./middleware/visitLog');
app.use(visitLog);

// API Routes
const authRoutes = require('./routes/auth');
const animeRoutes = require('./routes/anime');
const episodesRoutes = require('./routes/episodes');
const userRoutes = require('./routes/user');
const commentsRoutes = require('./routes/comments');
const forumRoutes = require('./routes/forum');
const adminRoutes = require('./routes/admin');
const importRoutes = require('./routes/import');
const searchRoutes = require('./routes/search');
const shopRoutes = require('./routes/shop');
const contactRoutes = require('./routes/contact');
const mangaRoutes = require('./routes/manga');
const ratingsRoutes = require('./routes/ratings');

app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/episodes', episodesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/import', importRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/manga', mangaRoutes);
app.use('/api/ratings', ratingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Anizil API is running',
    timestamp: new Date().toISOString()
  });
});

// --- পরিবর্তন এখানে ---
// যেহেতু 'dist' ফোল্ডারটি সরাসরি সার্ভার ফোল্ডারের ভেতরেই আছে, তাই '../client/dist' এর বদলে সরাসরি './dist' হবে।
const clientDist = path.join(__dirname, 'dist');
app.use(express.static(clientDist));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' }); //[cite: 1]
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: NODE_ENV === 'production' ? 'Internal server error' : err.message //[cite: 1]
  });
});

app.listen(PORT, () => {
  console.log(`Anizil server running on port ${PORT}`); //[cite: 1]
  console.log(`Environment: ${NODE_ENV}`); //[cite: 1]
  console.log(`Frontend: serving from ${clientDist}`);
});

module.exports = app;