const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

async function findChannel() {
  try {
    await app.start();
    console.log('🔍 Looking for #color-requests channel...');
    
    // Try to find the channel by name
    const result = await app.client.conversations.list({
      types: 'public_channel,private_channel'
    });
    
    const colorRequestsChannel = result.channels.find(channel => 
      channel.name === 'color-requests'
    );
    
    if (colorRequestsChannel) {
      console.log(`✅ Found #color-requests channel!`);
      console.log(`   Channel ID: ${colorRequestsChannel.id}`);
      console.log(`   Channel Name: #${colorRequestsChannel.name}`);
      console.log(`   Is Member: ${colorRequestsChannel.is_member}`);
    } else {
      console.log('❌ #color-requests channel not found');
      console.log('\n📋 Available channels:');
      result.channels.forEach(channel => {
        console.log(`- #${channel.name} (ID: ${channel.id})`);
      });
    }
    
    await app.stop();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findChannel();
