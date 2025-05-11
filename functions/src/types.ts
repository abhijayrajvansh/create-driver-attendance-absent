import { Timestamp } from "firebase-admin/firestore";

export interface DailyAttendance {
  date: Timestamp;
  driverPhoto: string;
  truckPhoto: string;
  status: "Present" | "Absent";
}

export interface DriversAttendance {
  id: string;
  driverId: string;
  attendance: DailyAttendance[];
}
