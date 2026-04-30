const mongoose = require('mongoose');
const dns = require('dns');

const configureDnsResolvers = () => {
  const dnsServers = (process.env.MONGODB_DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
    console.log(`Using DNS servers: ${dnsServers.join(', ')}`);
  }
};

const connectOptions = {
  family: 4,
  serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 15000),
};

const shouldTryFallback = (error) => {
  const msg = (error && error.message) || '';
  return /querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT|EAI_AGAIN/i.test(msg);
};

const connectDB = async () => {
  try {
    configureDnsResolvers();
    // We will get the connection string from our .env file
    const conn = await mongoose.connect(process.env.MONGODB_URI, connectOptions);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (process.env.MONGODB_URI_FALLBACK && shouldTryFallback(error)) {
      try {
        console.log('Primary MongoDB URI failed. Trying fallback URI...');
        const fallbackConn = await mongoose.connect(process.env.MONGODB_URI_FALLBACK, connectOptions);
        console.log(`MongoDB Connected (fallback): ${fallbackConn.connection.host}`);
        return;
      } catch (fallbackError) {
        console.error(`Error connecting to MongoDB with fallback URI: ${fallbackError.message}`);
        process.exit(1); // Exit process with failure code
      }
    }

    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure code
  }
};

module.exports = connectDB;
