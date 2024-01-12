const TelegramBot = require('node-telegram-bot-api');

const keep_alive = require('./keep_alive.js');

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new TelegramBot(process.env.Token, {
  polling: true,
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '/welcome') {
    bot.sendMessage(chatId, 'welcome to bot');
  }

  if (msg.text == '/start') {
    bot.sendMessage(chatId, 'welcome to testing bot...' + chatId);
  } else if (text == '/web') {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Open Web',
              web_app: { url: 'https://ink-finance.000webhostapp.com/' },
            },
          ],
        ],
      },
    };

    bot.sendMessage(chatId, 'Click below to launch the web app:', options);
  } else {
    const addressRegex = /^(0x)?[0-9a-fA-F]{40}$/;

    if (addressRegex.test(text)) {
      bot.sendMessage(chatId, 'This is a valid MetaMask wallet address.');
    } else {
      bot.sendMessage(chatId, 'This is not a valid MetaMask wallet address.');
    }
  }
});
