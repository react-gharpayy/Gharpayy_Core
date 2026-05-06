const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
    }
  });
}

// Models
const KPIDefinitionSchema = new mongoose.Schema({
  role: { type: String, required: true },
  kpiName: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['NUMBER', 'BOOLEAN'], default: 'NUMBER' },
  target: { type: mongoose.Schema.Types.Mixed, required: true },
  orderIndex: { type: Number, default: 0 }
});
const ArenaKPIDefinition = mongoose.models.ArenaKPIDefinition || mongoose.model('ArenaKPIDefinition', KPIDefinitionSchema);

const SprintPlanSchema = new mongoose.Schema({
  role: { type: String, required: true },
  sprintName: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  orderIndex: { type: Number, default: 0 }
});
const ArenaSprintPlan = mongoose.models.ArenaSprintPlan || mongoose.model('ArenaSprintPlan', SprintPlanSchema);

const DailyStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  kpis: { type: Map, of: Object, default: {} },
  sprints: { type: Map, of: Object, default: {} },
  decisions: [{ text: String, timestamp: Date }],
  shieldMode: { type: Boolean, default: false }
});
const ArenaDailyState = mongoose.models.ArenaDailyState || mongoose.model('ArenaDailyState', DailyStateSchema);

const UserSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  role: String,
  playbookRole: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const kpiSeeds = [
    { role: 'recruiter', kpiName: 'leads_contacted', label: 'Leads Contacted', type: 'NUMBER', target: 50 },
    { role: 'recruiter', kpiName: 'interviews_scheduled', label: 'Interviews Scheduled', type: 'NUMBER', target: 12 },
    { role: 'recruiter', kpiName: 'eod_report', label: 'EOD Report Submitted', type: 'BOOLEAN', target: true },
    
    { role: 'coach', kpiName: 'team_reviews', label: 'Team Reviews Completed', type: 'NUMBER', target: 5 },
    { role: 'coach', kpiName: 'escalations_resolved', label: 'Escalations Resolved', type: 'BOOLEAN', target: true },
    
    { role: 'floor_lead', kpiName: 'tours_completed', label: 'Tours Completed', type: 'NUMBER', target: 10 },
    { role: 'floor_lead', kpiName: 'shift_briefing', label: 'Shift Briefing Done', type: 'BOOLEAN', target: true },
    
    { role: 'comm_shield', kpiName: 'tickets_resolved', label: 'Tickets Resolved', type: 'NUMBER', target: 30 },
    { role: 'comm_shield', kpiName: 'sla_maintained', label: 'SLA Maintained', type: 'BOOLEAN', target: true },
  ];

  for (const seed of kpiSeeds) {
    await ArenaKPIDefinition.findOneAndUpdate(
      { role: seed.role, kpiName: seed.kpiName },
      { $set: seed },
      { upsert: true }
    );
  }
  console.log('KPIs seeded');

  const sprintSeeds = [
    { role: 'recruiter', sprintName: 'Morning Sourcing Blitz', startTime: '10:00', endTime: '12:00', orderIndex: 0 },
    { role: 'recruiter', sprintName: 'Candidate Outreach', startTime: '14:00', endTime: '16:00', orderIndex: 1 },
    { role: 'coach', sprintName: 'Team Calibration', startTime: '11:00', endTime: '12:30', orderIndex: 0 },
  ];

  for (const seed of sprintSeeds) {
    await ArenaSprintPlan.findOneAndUpdate(
      { role: seed.role, sprintName: seed.sprintName },
      { $set: seed },
      { upsert: true }
    );
  }
  console.log('Sprints seeded');

  const demoEmp = await User.findOne({ role: 'employee' });
  if (demoEmp) {
    const today = new Date().toISOString().split('T')[0];
    const demoState = {
      userId: demoEmp._id,
      date: today,
      kpis: {
        'leads_contacted': { value: 32, isDone: false },
        'interviews_scheduled': { value: 5, isDone: false },
        'eod_report': { value: false, isDone: false }
      },
      sprints: {
        0: { isDone: true, updatedAt: new Date() }
      },
      decisions: [
        { text: 'Prioritized hot leads over cold calling due to end-of-month target squeeze.', timestamp: new Date() }
      ],
      shieldMode: true
    };

    await ArenaDailyState.findOneAndUpdate(
      { userId: demoEmp._id, date: today },
      { $set: demoState },
      { upsert: true }
    );

    if (!demoEmp.playbookRole) {
      demoEmp.playbookRole = 'recruiter';
      await demoEmp.save();
    }
    console.log('Demo state seeded for user:', demoEmp.email);
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
