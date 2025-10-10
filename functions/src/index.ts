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
export * from "./bankTransactions";

// Export scheduled functions
export * from "./scheduled";

// Export Firestore triggers
export * from "./triggers";
