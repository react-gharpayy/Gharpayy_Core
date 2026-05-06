const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
      process.env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
    }
  });
}

// Models
const PlaybookRoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  color: { type: String, default: '#f97316' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const PlaybookRole = mongoose.models.PlaybookRole || mongoose.model('PlaybookRole', PlaybookRoleSchema);

const KPIDefinitionSchema = new mongoose.Schema({
  role: { type: String, required: true },
  kpiName: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['NUMBER', 'BOOLEAN'], default: 'NUMBER' },
  target: { type: mongoose.Schema.Types.Mixed, required: true }
});
const ArenaKPIDefinition = mongoose.models.ArenaKPIDefinition || mongoose.model('ArenaKPIDefinition', KPIDefinitionSchema);

const SprintPlanSchema = new mongoose.Schema({
  role: { type: String, required: true },
  sprintName: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
});
const ArenaSprintPlan = mongoose.models.ArenaSprintPlan || mongoose.model('ArenaSprintPlan', SprintPlanSchema);

const DailyStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  date: { type: String, required: true },
  kpis: { type: Map, of: Object, default: {} },
  sprints: { type: Map, of: Object, default: {} },
  decisions: [{ text: String, timestamp: Date }],
  shieldMode: { type: Boolean, default: false },
  eodReport: {
    summary: String,
    submittedAt: Date
  }
});
const ArenaDailyState = mongoose.models.ArenaDailyState || mongoose.model('ArenaDailyState', DailyStateSchema);

const UserSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  role: String,
  playbookRole: String,
  isApproved: Boolean
});
const User = mongoose.models.GpAttUser || mongoose.model('GpAttUser', UserSchema);

async function seedSDE() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI missing in .env.local');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Create SDE Role
  const sdeRole = await PlaybookRole.findOneAndUpdate(
    { slug: 'sde' },
    { 
      $set: { 
        name: 'SDE', 
        slug: 'sde', 
        color: '#2563eb', // Engineering Blue
        isActive: true 
      } 
    },
    { upsert: true, new: true }
  );
  console.log('SDE Role seeded');

  // 2. Seed SDE KPIs
  const kpiSeeds = [
    { role: 'sde', kpiName: 'prs_merged', label: 'PRs Merged', type: 'NUMBER', target: 5 },
    { role: 'sde', kpiName: 'bugs_resolved', label: 'Bugs Resolved', type: 'NUMBER', target: 8 },
    { role: 'sde', kpiName: 'code_reviews', label: 'Code Reviews Completed', type: 'NUMBER', target: 10 },
    { role: 'sde', kpiName: 'prod_deploy', label: 'Production Deployment Completed', type: 'BOOLEAN', target: true },
    { role: 'sde', kpiName: 'standup_attended', label: 'Daily Standup Attended', type: 'BOOLEAN', target: true },
  ];

  for (const seed of kpiSeeds) {
    await ArenaKPIDefinition.findOneAndUpdate(
      { role: seed.role, kpiName: seed.kpiName },
      { $set: seed },
      { upsert: true }
    );
  }
  console.log('SDE KPIs seeded');

  // 3. Seed SDE Sprint Plans
  const sprintSeeds = [
    { role: 'sde', sprintName: 'Morning Standup', startTime: '09:30', endTime: '10:00' },
    { role: 'sde', sprintName: 'Feature Development', startTime: '10:00', endTime: '13:00' },
    { role: 'sde', sprintName: 'Bug Fixing Window', startTime: '14:00', endTime: '16:00' },
    { role: 'sde', sprintName: 'PR Review Session', startTime: '16:00', endTime: '17:00' },
    { role: 'sde', sprintName: 'Deployment & Monitoring', startTime: '17:00', endTime: '18:00' },
  ];

  for (const seed of sprintSeeds) {
    await ArenaSprintPlan.findOneAndUpdate(
      { role: seed.role, sprintName: seed.sprintName },
      { $set: seed },
      { upsert: true }
    );
  }
  console.log('SDE Sprints seeded');

  // 4. Seed Demo SDE Employee State
  // Find or create a demo user
  let demoUser = await User.findOne({ email: 'sde.demo@gharpayy.com' });
  if (!demoUser) {
    demoUser = new User({
      fullName: 'Demo SDE Engineer',
      email: 'sde.demo@gharpayy.com',
      role: 'employee',
      playbookRole: 'sde',
      isApproved: true
    });
    await demoUser.save();
    console.log('Demo SDE User created');
  } else {
    demoUser.playbookRole = 'sde';
    demoUser.isApproved = true;
    await demoUser.save();
    console.log('Demo SDE User updated');
  }

  const today = new Date().toISOString().split('T')[0];
  const demoState = {
    userId: demoUser._id,
    date: today,
    kpis: {
      'prs_merged': { value: 3, isDone: false },
      'bugs_resolved': { value: 5, isDone: false },
      'code_reviews': { value: 4, isDone: false },
      'prod_deploy': { value: false, isDone: false },
      'standup_attended': { value: true, isDone: true },
    },
    sprints: {
      0: { isDone: true, updatedAt: new Date() }, // Standup
      1: { isDone: true, updatedAt: new Date() }, // Feature Dev
      2: { isDone: false }, // Bug Fixing
    },
    decisions: [
      { text: 'Blocked release due to failing payment integration tests.', timestamp: new Date() },
      { text: 'Prioritized production bugfix over feature sprint.', timestamp: new Date() }
    ],
    shieldMode: true,
    eodReport: {
      summary: 'Completed checkout API optimization, resolved 3 production bugs, and prepared deployment patch for staging review.',
      submittedAt: new Date()
    }
  };

  await ArenaDailyState.findOneAndUpdate(
    { userId: demoUser._id, date: today },
    { $set: demoState },
    { upsert: true }
  );
  console.log('Demo SDE daily state seeded');

  console.log('SDE Demo Seeding Complete!');
  process.exit(0);
}

seedSDE().catch(err => {
  console.error(err);
  process.exit(1);
});
