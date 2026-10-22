import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and across serverless function invocations.
 * This prevents creating multiple connections on every API request.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Establishes or retrieves a cached MongoDB connection using Mongoose.
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  if (!MONGODB_URI) {
    const errorMsg =
      "MongoDB Connection Error: 'MONGODB_URI' is not defined in your environment variables. Please check your .env.local file.";
    console.error(`[DB ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // If a connection is already cached and ready, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection promise doesn't exist yet, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose buffering to fail fast if disconnected
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log("[DB] Successfully connected to MongoDB Atlas.");
        return mongooseInstance;
      })
      .catch((err) => {
        console.error("[DB ERROR] Failed to connect to MongoDB Atlas:", err.message);
        cached.promise = null; // Reset promise so subsequent requests can retry
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default connectDB;
