/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// For v2, you often import specific triggers directly,
// but 'firebase-functions' can still act as a namespace for v2 in some setups.
// The key is how onRequest is called.
// import * as functions from "firebase-functions"; // This seems to be resolving to v2 in your setup
import { onRequest } from "firebase-functions/v2/https"; // Explicit v2 import for clarity
import { Request, Response } from "express";
import { db } from "./firebase/admin"; // Assuming this path is correct for your project structure
import { DriversAttendance, DailyAttendance } from "./types"; // Assuming this path is correct
import { Timestamp } from "firebase-admin/firestore";

// Cloud function that can be triggered via HTTP request (using v2 API syntax)
export const createDriversAttendanceAbsent = onRequest(
  { region: "asia-south1" }, // <-- Specify the region options object here for v2
  async (req: Request, res: Response) => {
    try {
      const driverCollectionRef = db.collection("drivers");
      const attendanceCollectionRef = db.collection("attendance");

      const querySnapshot = await driverCollectionRef.get();

      if (querySnapshot.empty) {
        console.error("No driver UIDs found");
        res.status(400).send("No driver UIDs found");
        return;
      }

      const driverDocumentIds = querySnapshot.docs.map((doc) => ({
        id: doc.id,
      }));

      const promises = driverDocumentIds.map(async (driver) => {
        const driverUID = driver.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day in the server's timezone

        const attendanceDocRef = attendanceCollectionRef.doc(driverUID);
        const attendanceDoc = await attendanceDocRef.get();

        const newAttendanceEntry: DailyAttendance = {
          date: Timestamp.fromDate(today),
          driverPhoto: "NA",
          truckPhoto: "NA",
          status: "Absent",
        };

        if (!attendanceDoc.exists) {
          const newAttendanceDoc: DriversAttendance = {
            id: driverUID,
            driverId: driverUID,
            attendance: [newAttendanceEntry],
          };
          await attendanceDocRef.set(newAttendanceDoc);
          console.log(`Created new attendance record for driver ${driverUID}`);
        } else {
          const existingData = attendanceDoc.data() as DriversAttendance;
          const todayExists = existingData.attendance.some((entry) => {
            const entryDate = (entry.date as Timestamp).toDate();
            const entryYear = entryDate.getFullYear();
            const entryMonth = entryDate.getMonth();
            const entryDay = entryDate.getDate();

            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth();
            const todayDay = today.getDate();

            return entryYear === todayYear && entryMonth === todayMonth && entryDay === todayDay;
          });

          if (!todayExists) {
            await attendanceDocRef.update({
              attendance: [...existingData.attendance, newAttendanceEntry],
            });
            console.log(`Updated attendance for driver ${driverUID}`);
          } else {
            console.log(
              `Today's attendance already exists for driver ${driverUID}`
            );
          }
        }
      });

      await Promise.all(promises);
      console.log("Successfully updated attendance records for all drivers");
      res
        .status(200)
        .send("Successfully updated attendance records for all drivers");
    } catch (error) {
      console.error("Error creating drivers attendance:", error);
      res.status(500).send("Failed to create drivers attendance: " + String(error));
    }
  }
);

// Alternative for v2: If you want ALL functions in this file to be in 'asia-south1'
// you could use setGlobalOptions at the top of the file:
/*
import { setGlobalOptions } from "firebase-functions/v2";
setGlobalOptions({ region: "asia-south1" });

// Then define your function without the region option:
// export const createDriversAttendanceAbsent = onRequest(async (req: Request, res: Response) => { ... });
*/