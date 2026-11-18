const mongoose = require('mongoose');

const connectDB = async () => {
  // Reuse existing connection if already connected (vital for serverless / Vercel)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gharkaam';
    const isAtlas = uri.startsWith('mongodb+srv://') || (!uri.includes('127.0.0.1') && !uri.includes('localhost'));
    
    const options = {
      serverSelectionTimeoutMS: 15000,
    };

    // Only apply directConnection and IPv4 forcing for local standalone instances
    if (!isAtlas) {
      options.directConnection = true;
      options.family = 4;
    }

    const conn = await mongoose.connect(uri, options);
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
