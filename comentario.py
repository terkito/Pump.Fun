const figlet = require('figlet');

// ASCII message
const message = 'TRIAL VERSION';

figlet(message, function(err, data) {
  if (err) {
    console.log('Something went wrong...');
    console.dir(err);
    return;
  }
  console.log(data);
  console.log('\nContact for more information or support:');
  console.log('Telegram: https://t.me/pumpfuntools2025');
});

