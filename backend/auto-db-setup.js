const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const passwordsToTry = ['postgres', 'root', 'admin', 'password', '123456', ''];
const username = 'postgres';

async function tryConnect() {
  for (const pwd of passwordsToTry) {
    console.log(`Trying username "${username}" with password "${pwd}"...`);
    const client = new Client({
      user: username,
      password: pwd,
      host: 'localhost',
      port: 5432,
      database: 'postgres', // Connect to default DB first
    });

    try {
      await client.connect();
      console.log(`SUCCESS! Connected with password "${pwd}".`);

      // Try to create the order_allocation database
      try {
        await client.query('CREATE DATABASE order_allocation');
        console.log('Database "order_allocation" created successfully.');
      } catch (e) {
        if (e.code === '42P04') {
          console.log('Database "order_allocation" already exists.');
        } else {
          console.error('Error creating database:', e.message);
        }
      }

      await client.end();

      // Update .env file
      const envPath = path.join(__dirname, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      const newUrl = `postgres://${username}:${pwd}@localhost:5432/order_allocation`;
      envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${newUrl}`);
      fs.writeFileSync(envPath, envContent);
      console.log(`Updated .env with the correct DATABASE_URL: ${newUrl}`);

      return true;
    } catch (err) {
      console.log(`Failed with password "${pwd}".`);
    }
  }

  console.error('\nCOULD NOT GUESS YOUR POSTGRESQL PASSWORD.');
  return false;
}

tryConnect().then(success => {
  if (success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
