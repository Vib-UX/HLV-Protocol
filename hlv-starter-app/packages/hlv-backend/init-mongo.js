// MongoDB initialization script
db = db.getSiblingDB('hlv-protocol');

// Create collections
db.createCollection('swaps');
db.createCollection('agendaJobs');

// Create indexes
db.swaps.createIndex({ swapId: 1 }, { unique: true });
db.swaps.createIndex({ userAddress: 1 });
db.swaps.createIndex({ status: 1 });
db.swaps.createIndex({ paymentHash: 1 });

print('HLV Protocol database initialized successfully');

