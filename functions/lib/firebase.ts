import { initializeApp, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  ref,
  getDownloadURL,
} from 'firebase/storage';
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDjRiBluUP2iR8lvSCYMZp_y45Scl9PwVw",
  authDomain: "artists-saved-songs-playlists.firebaseapp.com",
  projectId: "artists-saved-songs-playlists",
  storageBucket: "artists-saved-songs-playlists.appspot.com",
  messagingSenderId: "1008382025047",
  appId: "1:1008382025047:web:cb50786653a8fa6d5bb212",
  measurementId: "G-RSX2S3VY67"
};

function createFirebaseApp(firebaseConfig) {
  try {
    return getApp();
  } catch {
    return initializeApp(firebaseConfig);
  }
}

const firebaseApp = createFirebaseApp(firebaseConfig);

// Firestore exports
export const firestore = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const analytics = isSupported().then(yes => yes ? getAnalytics(firebaseApp) : null);

/// Helper functions

/**`
 * Converts a firestore document to JSON
 * @param  {DocumentSnapshot} doc
 */
export function postToJSON(doc) {
  const data = doc.data();
  return {
    DocumentID: doc.id,
    ...data
  };
}