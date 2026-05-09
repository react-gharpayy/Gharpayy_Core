const mongoose = require('mongoose');

async function debugIntelligence() {
  const MONGODB_URI = 'mongodb+srv://hitesh:gharpayy123@cluster0.b0f0a.mongodb.net/Gharpayy_Core';
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'gpattusers');
  const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'gpattendances');
  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'gptasks');
  const Tracker = mongoose.model('Tracker', new mongoose.Schema({}, { strict: false }), 'gptrackers');

  const startTime = Date.now();

  const employees = await User.find({ 
    role: { $in: ['employee', 'manager', 'lead'] }
  }).lean();
  
  console.log('Found Employees:', employees.length);
  const employeeIds = employees.map(e => e._id);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  console.log('Fetching bulk data...');
  const [allAttendances, allTasks, allTrackers] = await Promise.all([
    Attendance.find({ employeeId: { $in: employeeIds }, date: { $gte: thirtyDaysAgoStr } }).lean(),
    Task.find({ assignedTo: { $in: employeeIds } }).lean(),
    Tracker.find({ employeeId: { $in: employeeIds }, date: { $gte: thirtyDaysAgoStr } }).lean(),
  ]);

  console.log('Attendance Records:', allAttendances.length);
  console.log('Task Records:', allTasks.length);
  console.log('Tracker Records:', allTrackers.length);

  const debug = [];
  const attMap = {};
  allAttendances.forEach(a => {
    if (!a.employeeId) return;
    const eid = a.employeeId.toString();
    if (!attMap[eid]) attMap[eid] = [];
    attMap[eid].push(a);
  });

  const todayStr = new Date().toISOString().split('T')[0];

  for (const emp of employees) {
    const eidStr = emp._id.toString();
    const attendances = attMap[eidStr] || [];
    if (attendances.length === 0) continue;

    debug.push({ name: emp.fullName, attendances: attendances.length });
  }

  console.log('Employees with data processed:', debug.length);
  console.log('Total Duration (ms):', Date.now() - startTime);
  process.exit(0);
}

debugIntelligence().catch(err => {
  console.error(err);
  process.exit(1);
});
