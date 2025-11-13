# Firebase High Scores Setup Instructions

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or use an existing project
3. Follow the setup wizard (you can disable Google Analytics if you don't need it)

## Step 2: Enable Realtime Database

1. In your Firebase project, click "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose a location close to your users
4. Start in **test mode** for now (we'll secure it later)

## Step 3: Get Your Firebase Configuration

1. Click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app
5. Give it a name (e.g., "Burger Run Game")
6. Copy the `firebaseConfig` object

## Step 4: Update Your Configuration

1. Open `novGame/src/firebase-config.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
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
```

## Step 5: Set Up Database Security Rules (Important!)

1. Go back to Realtime Database in Firebase Console
2. Click the "Rules" tab
3. Replace the rules with these (allows anyone to read scores, but validates writes):

```json
{
  "rules": {
    "highScores": {
      ".read": true,
      ".write": true,
      "$scoreId": {
        ".validate": "newData.hasChildren(['playerName', 'score', 'timestamp', 'date']) && newData.child('score').isNumber() && newData.child('playerName').isString()"
      }
    }
  }
}
```

4. Click "Publish"

## Step 6: Test It Out

1. Run your game: `npm run dev`
2. Play the game and get a game over
3. Enter your name when prompted
4. Check the Firebase Console > Realtime Database to see your score!

## Features

- ✅ Saves player name, score, and timestamp
- ✅ Stores scores in Firebase Realtime Database
- ✅ Accessible from anywhere (all users see the same high scores)
- ✅ Free tier supports up to 100 simultaneous connections
- ✅ Automatic syncing across all players

## Optional: View High Scores

To display high scores on a leaderboard page, you can use:

```javascript
import HighScoreManager from './firebase-config.js';

const scoreManager = new HighScoreManager();

// Get top 10 scores
const topScores = await scoreManager.getTopScores(10);
console.log(topScores);

// Or listen for real-time updates
scoreManager.onScoresUpdate((scores) => {
    console.log('Updated scores:', scores);
    // Update your UI here
});
```

## Troubleshooting

- **Scores not saving**: Check browser console for errors and verify your Firebase config
- **Permission denied**: Make sure your database rules allow writes
- **Database URL missing**: Ensure you're using Realtime Database (not Firestore)
