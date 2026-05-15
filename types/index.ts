export interface AuthPayload {
  id: string;
  email: string;
  fullName: string;
  /** Legacy role field — kept for backward compatibility */
  role: 'admin' | 'manager' | 'employee' | 'sub_admin' | 'hr' | 'team_lead';
  /**
   * Permission tier used by lib/permissions.ts for access control.
   * When present and non-null, this takes precedence over `role` for permission checks.
   * Valid: 'admin' | 'manager' | 'team_lead' | 'hr' | 'employee'
   * null = not yet assigned, falls back to `role`
   */
  systemRole?: string | null;
  /** ID of the team this user belongs to */
  teamId?: string;
  /** @deprecated use teamId instead */
  assignedTeamId?: string;
  playbookRole?: string;
  /** ID of the HierarchyRole document for display purposes */
  hierarchyRoleId?: string;
}

export interface LeaveBalance {
  employeeId: string;
  paid: number;
  sick: number;
  casual: number;
  compOff: number;
  lop: number;
  encashable: number;
  encashed: number;
  ratePerDay?: number;
}

export interface LeaveRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  type: 'Paid' | 'Sick' | 'Casual' | 'Comp Off' | 'LOP';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  appliedAt?: string;
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
