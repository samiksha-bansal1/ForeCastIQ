// import {
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signOut,
//   onAuthStateChanged,
//   User,
// } from "firebase/auth";
// import { auth } from "./firebase";

// // LOGIN
// export const login = async (email: string, password: string) => {
//   return await signInWithEmailAndPassword(auth, email, password);
// };

// // SIGNUP
// export const signup = async (email: string, password: string) => {
//   return await createUserWithEmailAndPassword(auth, email, password);
// };

// // LOGOUT
// export const logout = async () => {
//   return await signOut(auth);
// };

// // LISTEN USER
// export const listenToAuth = (callback: (user: User | null) => void) => {
//   return onAuthStateChanged(auth, callback);
// };

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

// LOGIN
export const login = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase not configured");
  return await signInWithEmailAndPassword(auth, email, password);
};

// SIGNUP
export const signup = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase not configured");
  return await createUserWithEmailAndPassword(auth, email, password);
};

// LOGOUT
export const logout = async () => {
  if (!auth) throw new Error("Firebase not configured");
  return await signOut(auth);
};

// LISTEN USER
export const listenToAuth = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};