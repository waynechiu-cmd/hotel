require('dotenv').config();
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD Length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
console.log('DB_PASSWORD First 2:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.substring(0, 2) : 'N/A');
console.log('DB_PASSWORD Contains $:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.includes('$') : false);
