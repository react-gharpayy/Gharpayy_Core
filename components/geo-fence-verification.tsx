'use client';
import { useEffect, useState } from 'react';
import { Clock, MapPin, Navigation, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// ── Koramangala office coordinates ──────────────────────────────────────────
const OFFICE_LAT = 12.93482;
const OFFICE_LNG = 77.61124;
const OFFICE_NAME = 'Koramangala Office, Bangalore';
const GEO_RADIUS_M = 100; // 100 metre radius

// ── Haversine distance (metres) ─────────────────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const COLORS = ['bg-blue-200','bg-purple-200','bg-yellow-200','bg-green-200','bg-pink-200','bg-orange-200'];
const TEXT_COLORS = ['text-blue-700','text-purple-700','text-yellow-700','text-green-700','text-pink-700','text-orange-700'];

function colorIdx(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % COLORS.length;
  return h;
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}
function fmtDistance(m: number) {
  return m < 1000 ? `${Math.round(m)}m away` : `${(m / 1000).toFixed(1)}km away`;
}

interface EmpGeo {
  employeeId: string;
  employeeName: string;
  role: string;
  lat: number | null;
  lng: number | null;
  checkInTime: string | null;
  isCheckedIn: boolean;
  distance: number | null;
  isInside: boolean;
}

export default function GeoFenceVerification() {
  const [employees, setEmployees] = useState<EmpGeo[]>([]);
  const [present, setPresent] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number; dist: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    fetch('/api/attendance/geofence', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const emps: EmpGeo[] = (d.employees || []).map((e: any) => {
          const dist = e.lat && e.lng
            ? haversineDistance(e.lat, e.lng, OFFICE_LAT, OFFICE_LNG)
            : null;
          return { ...e, distance: dist, isInside: dist !== null ? dist <= GEO_RADIUS_M : false };
        });
        setEmployees(emps);
        setPresent(d.present || 0);
        setTotal(d.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const checkMyLocation = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const dist = haversineDistance(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, dist });
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const inside  = employees.filter(e => e.isInside).length;
  const outside = employees.filter(e => e.checkInTime && !e.isInside).length;
  const noGps   = employees.filter(e => e.checkInTime && e.lat === null).length;

  return (
    <div className="bg-white rounded-3xl border border-gray-300 p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Attendance</h2>
        </div>
        <span className="text-gray-500 text-sm md:text-base">
          Today · <strong className="text-gray-800">{present}/{total} present</strong>
        </span>
      </div>

      <h3 className="text-gray-600 text-sm md:text-base font-medium mb-6">Geo-Fence Verification</h3>

      {/* Map visual — realistic grid map with concentric circles */}
      <div className="rounded-2xl overflow-hidden border border-blue-200 mb-6">
        {/* Map grid background */}
        <div className="relative h-52 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
          }}>

          {/* Street grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            {/* Horizontal streets */}
            {[20,40,60,80].map(y => <line key={`h${y}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#1d4ed8" strokeWidth="1"/>)}
            {/* Vertical streets */}
            {[15,30,45,60,75,90].map(x => <line key={`v${x}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#1d4ed8" strokeWidth="1"/>)}
            {/* Diagonal road */}
            <line x1="0" y1="100%" x2="70%" y2="0" stroke="#1d4ed8" strokeWidth="2" strokeDasharray="4,4"/>
          </svg>

          {/* Green blocks (buildings) */}
          <svg className="absolute inset-0 w-full h-full opacity-15">
            {[[10,10,12,8],[45,15,10,6],[70,8,8,10],[20,55,14,8],[55,65,10,7],[80,50,9,8],[30,30,8,6],[65,35,7,9]].map(([x,y,w,h],i) => (
              <rect key={i} x={`${x}%`} y={`${y}%`} width={`${w}%`} height={`${h}%`} fill="#15803d" rx="1"/>
            ))}
          </svg>

          {/* Outer glow ring */}
          <div className="absolute w-44 h-44 rounded-full border-2 border-orange-300 opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 70%)' }}/>

          {/* 200m ring */}
          <div className="absolute w-36 h-36 rounded-full border border-dashed border-orange-400 opacity-40"/>

          {/* Geo-fence circle — 100m */}
          <div className="absolute w-24 h-24 rounded-full border-2 border-orange-500 opacity-70"
            style={{ background: 'rgba(251,146,60,0.1)' }}/>

          {/* Office pin */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-orange-500 border-3 border-white shadow-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" fill="currentColor"/>
            </div>
            <div className="mt-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
              <p className="text-xs font-semibold text-gray-800">Koramangala Office</p>
              <p className="text-[10px] text-gray-500 text-center">100m radius</p>
            </div>
          </div>

          {/* Employee dots on map */}
          {employees.filter(e => e.checkInTime).map((emp, i) => {
            // Place dots around the office pin based on inside/outside
            const angle = (i / employees.length) * 2 * Math.PI;
            const r = emp.isInside ? 35 : 90; // px from center
            const x = 50 + (r * Math.cos(angle) / 2.5);
            const y = 50 + (r * Math.sin(angle) / 2.5);
            const ci = colorIdx(emp.employeeName);
            return (
              <div key={emp.employeeId}
                className={`absolute w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold ${COLORS[ci]} ${TEXT_COLORS[ci]}`}
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                title={emp.employeeName}>
                {initials(emp.employeeName)}
              </div>
            );
          })}

          {/* Labels */}
          <div className="absolute bottom-2 right-3 text-[9px] text-blue-600/60 font-medium">
            12.9348°N, 77.6112°E
          </div>
        </div>

        {/* Map footer */}
        <div className="bg-white border-t border-blue-100 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500"/>
              <span className="text-xs text-gray-600">{inside} Inside</span>
            </div>
            {outside > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"/>
                <span className="text-xs text-gray-600">{outside} Outside</span>
              </div>
            )}
            {noGps > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300"/>
                <span className="text-xs text-gray-600">{noGps} No GPS</span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400">Radius: {GEO_RADIUS_M}m</span>
        </div>
      </div>

      {/* Check my location button */}
      <button
        onClick={checkMyLocation}
        disabled={locLoading}
        className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 border border-orange-200 rounded-xl text-sm font-medium text-orange-500 hover:bg-orange-50 transition disabled:opacity-60"
      >
        <Navigation className="w-4 h-4" />
        {locLoading ? 'Getting location...' : 'Check My Current Location'}
      </button>

      {/* My location result */}
      {myLocation && (
        <div className={`mb-4 p-3 rounded-xl border flex items-center gap-3 ${
          myLocation.dist <= GEO_RADIUS_M
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {myLocation.dist <= GEO_RADIUS_M
            ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0"/>
            : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0"/>}
          <div>
            <p className={`text-sm font-semibold ${myLocation.dist <= GEO_RADIUS_M ? 'text-green-700' : 'text-red-700'}`}>
              {myLocation.dist <= GEO_RADIUS_M ? 'You are inside the geo-fence ✓' : 'You are outside the geo-fence'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {fmtDistance(myLocation.dist)} from office · {myLocation.lat.toFixed(5)}°N, {myLocation.lng.toFixed(5)}°E
            </p>
          </div>
        </div>
      )}

      {/* Employee list */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl"/>)}
        </div>
      ) : employees.filter(e => e.checkInTime).length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
          <p className="text-sm text-gray-400">No check-ins today yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.filter(e => e.checkInTime).map((emp) => {
            const ci = colorIdx(emp.employeeName);
            const hasGps = emp.lat !== null;
            return (
              <div key={emp.employeeId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${COLORS[ci]} flex items-center justify-center text-xs font-bold ${TEXT_COLORS[ci]} flex-shrink-0`}>
                    {initials(emp.employeeName)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{emp.employeeName}</p>
                    <p className="text-xs text-gray-500">
                      {hasGps
                        ? emp.distance !== null ? fmtDistance(emp.distance) : 'GPS captured'
                        : 'No GPS data'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!hasGps ? (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-gray-400"/>
                      <span className="text-xs text-gray-400 font-medium">No GPS</span>
                    </div>
                  ) : emp.isInside ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-teal-500"/>
                      <span className="text-xs font-semibold text-teal-600">Inside</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400"/>
                      <span className="text-xs font-semibold text-red-500">Outside</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Office info footer */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0"/>
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">{OFFICE_NAME}</span>
          {' '}· Geo-fence radius: {GEO_RADIUS_M}m · {inside}/{employees.filter(e => e.checkInTime).length} verified
        </p>
      </div>
    </div>
  );
}
