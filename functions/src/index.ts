/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from 'firebase-admin';

import fetchBusTime from "./fetchBusTime";
import insertBabyEvents from "./insertBabyEvents";
import { fetchBabyEvents } from './fetchBabyEvent';
import { predictMilkFunction } from './predictMilkFunction';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

admin.initializeApp();


export const fetchBusTimeFunction = fetchBusTime;
export const insertBabyEventsFunction = insertBabyEvents;
export const fetchBabyEventsFunction = fetchBabyEvents;
export { predictMilkFunction };