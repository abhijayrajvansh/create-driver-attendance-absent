/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { db } from "./firebase/admin";
import { DriversAttendance, DailyAttendance } from "./types";
import { Timestamp } from "firebase-admin/firestore";

// Cloud function that can be triggered via HTTP request (using v1 API)
export const createDriversAttendanceAbsent = functions.https.onRequest(
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

      // Process each driver asynchronously
      const driverDocumentIds = querySnapshot.docs.map((doc) => ({
        id: doc.id,
      }));

      // Process each driver asynchronously
      const promises = driverDocumentIds.map(async (driver) => {
        const driverUID = driver.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day

        const attendanceDocRef = attendanceCollectionRef.doc(driverUID);
        const attendanceDoc = await attendanceDocRef.get();

        const newAttendanceEntry: DailyAttendance = {
          date: Timestamp.fromDate(today),
          driverPhoto: "NA",
          truckPhoto: "NA",
          status: "Absent",
        };

        if (!attendanceDoc.exists) {
          // Case 1: Create new attendance document
          const newAttendanceDoc: DriversAttendance = {
            id: driverUID,
            driverId: driverUID,
            attendance: [newAttendanceEntry],
          };
          await attendanceDocRef.set(newAttendanceDoc);
          console.log(`Created new attendance record for driver ${driverUID}`);
        } else {
          // Case 2: Update existing attendance document
          const existingData = attendanceDoc.data() as DriversAttendance;

          // Check if today's entry already exists
          const todayExists = existingData.attendance.some((entry) => {
            const entryDate = (entry.date as Timestamp).toDate();
            return entryDate.toDateString() === today.toDateString();
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
      res.status(500).send("Failed to create drivers attendance: " + error);
    }
  }
);
