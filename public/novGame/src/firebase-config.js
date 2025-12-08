// Firebase configuration
// IMPORTANT: Replace these values with your actual Firebase project credentials
// To get these values:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing)
// 3. Go to Project Settings > General
// 4. Scroll to "Your apps" and click the web icon (</>)
// 5. Copy the firebaseConfig object

const firebaseConfig = {
  apiKey: "AIzaSyCU2R3qRVbgULXXNNb_ylFrNgEi503NmzY",
  authDomain: "dadtechgames.firebaseapp.com",
  databaseURL: "https://dadtechgames-default-rtdb.firebaseio.com",
  projectId: "dadtechgames",
  storageBucket: "dadtechgames.firebasestorage.app",
  messagingSenderId: "789983660743",
  appId: "1:789983660743:web:1cac887b0bc490ab764ce2",
  measurementId: "G-BV33W61TY2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get database reference
const database = firebase.database();

// High Scores Manager
class HighScoreManager {
    constructor() {
        this.scoresRef = database.ref('highScores');
    }

    // Save a new score
    async saveScore(playerName, score) {
        try {
            const newScoreRef = this.scoresRef.push();
            await newScoreRef.set({
                playerName: playerName,
                score: score,
                timestamp: Date.now(),
                date: new Date().toISOString()
            });
            console.log('Score saved successfully!');
            return true;
        } catch (error) {
            console.error('Error saving score:', error);
            return false;
        }
    }

    // Get top 10 scores
    async getTopScores(limit = 10) {
        try {
            const snapshot = await this.scoresRef
                .orderByChild('score')
                .limitToLast(limit)
                .once('value');
            
            const scores = [];
            snapshot.forEach((childSnapshot) => {
                scores.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by score descending (since Firebase orders ascending)
            return scores.reverse();
        } catch (error) {
            console.error('Error getting scores:', error);
            return [];
        }
    }

    // Listen for real-time score updates
    onScoresUpdate(callback) {
        this.scoresRef
            .orderByChild('score')
            .limitToLast(10)
            .on('value', (snapshot) => {
                const scores = [];
                snapshot.forEach((childSnapshot) => {
                    scores.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                callback(scores.reverse());
            });
    }
}

// Export for use in other files
export default HighScoreManager;
