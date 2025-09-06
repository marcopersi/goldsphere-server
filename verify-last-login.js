/**
 * Simple script to verify last_login functionality
 */

const { getPool } = require('./dist/dbConfig');

async function checkLastLogin() {
  try {
    // Query the database for the test user's last_login
    const result = await getPool().query(
      'SELECT email, last_login, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_login)) as seconds_ago FROM users WHERE email = $1',
      ['bank.technical@goldsphere.vault']
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User Email:', user.email);
      console.log('Last Login:', user.last_login);
      console.log('Seconds Ago:', parseFloat(user.seconds_ago).toFixed(2));
      
      if (user.last_login && parseFloat(user.seconds_ago) < 60) {
        console.log('✅ last_login was recently updated - functionality works!');
      } else {
        console.log('❌ last_login was not recently updated');
      }
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await getPool().end();
  }
}

checkLastLogin();
