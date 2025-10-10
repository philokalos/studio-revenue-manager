/**
 * Firebase Functions Entry Point
 * Studio Revenue Manager Backend
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export authentication functions
export * from "./auth";

// Export CRUD functions
export * from "./reservations";
export * from "./quotes";
export * from "./invoices";

// Export utility functions
export * from "./calendar";
export * from "./csvMatching";

// Export scheduled functions
export * from "./scheduled";
