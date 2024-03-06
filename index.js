const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const ethers = require('ethers');

const keep_alive = require('./keep_alive.js');
let telegram_bot_token = '7107034391:AAHqyRFDjFCgBazgswzY_CRAYdtlgMQO-N4';

const bot = new TelegramBot(telegram_bot_token, { polling: true });

let web_button;
let web_url = 'https://msnsale.rf.gd';

// first time start
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const refferal_id = match && match[1] ? match[1].trim() : null;

    let web_button_url = web_url + '?id=' + refferal_id +"&user="+chatId;

    web_button = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Web',
              web_app: {
                url: web_button_url,
              },
            },
          ],
        ],
      },
    };

    bot.sendMessage(chatId, 'Click to buy MSN token', web_button)
      .then(() => {
        bot.sendMessage('5204205237', `UserId:- <code>${chatId}</code>`, {
          parse_mode: 'HTML',
        });
    });
    
});

bot.on('message',(msg) => {
  const chatId = msg.chat.id;

  let web_button_url_1 = web_url + '?id=null' + '&user=' + chatId;

  web_button = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Web',
            web_app: {
              url: web_button_url_1,
            },
          },
        ],
      ],
    },
  };

  const go_web = {
    reply_markup: {
      inline_keyboard: [[{ text: 'Visit Website', url: web_button_url_1 }]],
    },
  };

  bot.sendMessage(chatId, 'Click to buy MSN token', go_web);
  
});
