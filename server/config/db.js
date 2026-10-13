const mongoose = require('mongoose');
require('dotenv').config();

const boundedInt = (value, fallback, max) => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) ? Math.max(1, Math.min(max, parsed)) : fallback;
};

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
        // Keep free Atlas connection usage conservative. Environment config may
        // lower the pool but cannot raise it beyond five connections per process.
        const maxPoolSize = boundedInt(process.env.MONGO_MAX_POOL_SIZE, 5, 5);
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize,
            minPoolSize: 0,
            maxConnecting: 2,
            maxIdleTimeMS: 45000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority',
        });
        console.log('[db] MongoDB connected with bounded pool:', { maxPoolSize, minPoolSize: 0 });
    } catch (err) {
        console.error('[db] MongoDB connection failed:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
