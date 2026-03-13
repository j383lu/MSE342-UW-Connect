// Import the functions needed from the Firebase SDKs
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
} from 'firebase/auth';

// Your web app's Firebase configuration
// Paste the config you copied in Step 1 here
const firebaseConfig = {
    apiKey: "AIzaSyCONLMa9Qy9u6bPC_zN93GscdC6jmoVW7M",
    authDomain: "mse342-group1.firebaseapp.com",
    projectId: "mse342-group1",
    storageBucket: "mse342-group1.firebasestorage.app",
    messagingSenderId: "366555015011",
    appId: "1:366555015011:web:6af946af42477d7eb59556"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

class Firebase {
    constructor() {
        this.auth = getAuth(app);
        this.googleProvider = new GoogleAuthProvider();
    }
// *** Auth API ***
    doCreateUserWithEmailAndPassword = (email, password) =>
        createUserWithEmailAndPassword(this.auth, email, password);

    doSignInWithEmailAndPassword = (email, password) =>
        signInWithEmailAndPassword(this.auth, email, password);

    doSignInWithGoogle = () =>
        signInWithPopup(this.auth, this.googleProvider);

    doSignOut = () => signOut(this.auth);

    doPasswordReset = email => sendPasswordResetEmail(this.auth, email);

    doPasswordUpdate = password =>
        updatePassword(this.auth.currentUser, password);

// Function to get ID Token of the currently signed-in user
doGetIdToken = () => {
    return new Promise((resolve, reject) => {
        const user = this.auth.currentUser;
        if (user) {
            user
                .getIdToken()
                .then(token => {
                    resolve(token);
            })
            .catch(error => {
                reject(error);
            });
            } else {
                reject(new Error('No user is signed in.'));
            }
        });
    };
}

export default Firebase;