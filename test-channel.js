const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

async function testChannel() {
  try {
    await app.start();
    console.log('🔍 Testing channel access...');
    
    // Test if we can access the channel
    const channelId = 'C09FUNUELMV';
    
    try {
      const result = await app.client.conversations.info({
        channel: channelId
      });
      
      console.log('✅ Channel found!');
      console.log(`   Name: #${result.channel.name}`);
      console.log(`   ID: ${result.channel.id}`);
      console.log(`   Is Member: ${result.channel.is_member}`);
      
      if (!result.channel.is_member) {
        console.log('❌ Bot is NOT a member of this channel');
        console.log('   You need to invite the bot to the channel');
      }
      
    } catch (error) {
      console.log('❌ Cannot access channel:', error.message);
      
      if (error.data && error.data.error === 'channel_not_found') {
        console.log('   The channel ID might be incorrect');
      } else if (error.data && error.data.error === 'missing_scope') {
        console.log('   Missing required scopes');
      }
    }
    
    await app.stop();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testChannel();
