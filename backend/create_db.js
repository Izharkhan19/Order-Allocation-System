const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:SQT@123@localhost:5432/postgres',
});

async function createDatabase() {
  try {
    await client.connect();
    console.log('Connected to default postgres database...');
    await client.query('CREATE DATABASE order_allocation');
    console.log('Database "order_allocation" created successfully!');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('Database "order_allocation" already exists.');
    } else {
      console.error('Error creating database:', error);
    }
  } finally {
    await client.end();
  }
}

createDatabase();
