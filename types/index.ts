export interface AuthPayload {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'employee';
}

export interface AttendanceRecord {
  _id: string;
  employeeId: string;
  date: string;
  dayStatus: 'Early' | 'On Time' | 'Late' | 'Absent';
  sessions: SessionRecord[];
  totalWorkMins: number;
  totalBreakMins: number;
  lateByMins: number;
  earlyByMins: number;
  isCheckedIn: boolean;
  isOnBreak: boolean;
  isInField: boolean;
  workMode: 'Present' | 'Break' | 'Field' | 'WFH' | 'Absent';
}

export interface SessionRecord {
  checkIn: Date;
  checkOut: Date | null;
  type: 'work' | 'break' | 'field';
  minutes: number;
  workMinutes: number;
  lat: number | null;
  lng: number | null;
}

export interface MongooseCache {
  conn: typeof import('mongoose') | null;
  promise: Promise<typeof import('mongoose')> | null;
}
