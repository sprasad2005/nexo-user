const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0';

async function clearAllOldIpos() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('nexo');

    console.log('=== CLEARING ALL OLD IPOS FROM DATABASE ===');
    
    // 1. Clear ipos collection in MongoDB
    const iposCollection = db.collection('ipos');
    const existingIpos = await iposCollection.find({}).toArray();
    console.log(`Found ${existingIpos.length} IPO records in MongoDB.`);
    if (existingIpos.length > 0) {
      console.log('Old IPO Names:', [...new Set(existingIpos.map(i => i.name))]);
    }

    const deleteResult = await iposCollection.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} records from MongoDB collection 'ipos'.`);

    // 2. Clear any other collections referencing ipo data if needed
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (col.name === 'profit_distributions') {
        const res = await db.collection(col.name).deleteMany({});
        console.log(`✓ Deleted ${res.deletedCount} from '${col.name}'.`);
      }
    }

    // 3. Clear shared_ipos.json in local and parent directories
    const paths = [
      path.join(process.cwd(), 'shared_ipos.json'),
      path.join(process.cwd(), '..', 'shared_ipos.json'),
      path.join(__dirname, '..', 'shared_ipos.json'),
      path.join(__dirname, '..', '..', 'shared_ipos.json'),
    ];

    for (const p of paths) {
      try {
        fs.writeFileSync(p, JSON.stringify([], null, 2), 'utf-8');
        console.log(`✓ Cleared file store: ${p}`);
      } catch (err) {
        // file path might not exist or be duplicate
      }
    }

    // 4. Verify MongoDB count
    const remainingCount = await iposCollection.countDocuments();
    console.log(`\n=== Verification: Remaining IPO count in MongoDB: ${remainingCount} ===`);

  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await client.close();
  }
}

clearAllOldIpos();
