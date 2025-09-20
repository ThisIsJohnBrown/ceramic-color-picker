// Quick script to find channel IDs
const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

async function listChannels() {
  try {
    await app.start();
    console.log('🔍 Finding channels...');
    
    const result = await app.client.conversations.list({
      types: 'public_channel,private_channel'
    });
    
    console.log('\n📋 Available channels:');
    result.channels.forEach(channel => {
      console.log(`- #${channel.name} (ID: ${channel.id})`);
    });
    
    await app.stop();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listChannels();
