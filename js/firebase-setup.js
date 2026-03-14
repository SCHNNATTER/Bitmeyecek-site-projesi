// ==========================================
// FIREBASE CONNECTION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCp02JKeA1HHmQ-MaTAxwklaob3LZh4k7I",
    authDomain: "bitmeyecek-site-projesi.firebaseapp.com",
    projectId: "bitmeyecek-site-projesi",
    storageBucket: "bitmeyecek-site-projesi.firebasestorage.app",
    messagingSenderId: "52233887739",
    appId: "1:52233887739:web:30440e9bea18443e46b55e",
    databaseURL: "https://bitmeyecek-site-projesi-default-rtdb.firebaseio.com/" 
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const rollsRef = database.ref('rolls'); 
const initRef = database.ref('initiative_list');