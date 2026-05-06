const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://hitesh:gharpayy123@ac-otfuvl3-shard-00-00.iibqlyr.mongodb.net:27017,ac-otfuvl3-shard-00-01.iibqlyr.mongodb.net:27017,ac-otfuvl3-shard-00-02.iibqlyr.mongodb.net:27017/gharpayy-attendance?ssl=true&replicaSet=atlas-rgh7p2-shard-0&authSource=admin&appName=Cluster0";

const PlaybookRoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  color: { type: String, default: '#f97316' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const PlaybookRole = mongoose.models.PlaybookRole || mongoose.model('PlaybookRole', PlaybookRoleSchema);

const INITIAL_ROLES = [
  { name: 'Recruiter', slug: 'recruiter', color: '#f97316' },
  { name: 'Coach', slug: 'coach', color: '#6366f1' },
  { name: 'Floor Lead (Tour)', slug: 'floor_lead_tour', color: '#10b981' },
  { name: 'Comm Shield', slug: 'comm_shield', color: '#a855f7' },
  { name: 'HR', slug: 'hr', color: '#ec4899' },
  { name: 'Floor Lead (Office)', slug: 'floor_lead_office', color: '#f59e0b' },
  { name: 'Owner', slug: 'owner', color: '#111827' },
];

async function seedRoles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const role of INITIAL_ROLES) {
      await PlaybookRole.findOneAndUpdate(
        { slug: role.slug },
        { $set: role },
        { upsert: true, new: true }
      );
      console.log(`Role seeded: ${role.name}`);
    }

    console.log('Role seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedRoles();
