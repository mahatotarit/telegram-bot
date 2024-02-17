const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const keep_alive = require('./keep_alive.js');
const ethers = require('ethers');

const dotenv = require('dotenv');

dotenv.config();

const myAddress = process.env.MY_ADDRESS; // my address
const msn_price = process.env.MSN_PRICE; // 1 USDT = 20000 MSN
const per_reffer = process.env.PER_REFFER; // per reffer msn token
const token_contract_address = process.env.TOKEN_CONTRACT_ADDRESS; // msn token contract address
const bot_link = process.env.BOT_LINK;
let etherscan_url = process.env.SEPOLIA_SCAN_URL;
let help_tele = process.env.HELP;
let db_api_url = process.env.DB_API_URL;

// Binance API endpoint for getting transaction list
const API_KEY = process.env.API_KEY;
const TRANSACTION_LIST_ENDPOINT = process.env.TRANSACTION_LIST_ENDPOINT;

try {
  // =========================== tx ==========================

  //fetch usdt price of tx amount
  async function getEthPriceInUsdt(wei_value) {
    const url = 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT';

    try {
      const response = await fetch(url);

      const data = await response.json();
      const ethPrice = parseFloat(data.price);

      const weiPerEth = 10 ** 18;
      const amount = wei_value;
      const ethPriceUSDT = ethPrice;

      const valueToUsdt = (ethPriceUSDT / weiPerEth) * amount;

      return valueToUsdt;
    } catch (error) {
      console.error('Error occurred:', error);
      return null;
    }
  }

  // fetch all tx history between two address's
  async function fetchTransactionHistory(
    fetch_userAddress,
    fetch_api_key,
    fetch_endpoint,
  ) {
    try {
      const response = await axios.get(fetch_endpoint, {
        params: {
          module: 'account',
          action: 'txlist',
          address: fetch_userAddress,
          apikey: fetch_api_key,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
        },
      });

      let result = response.data.result;

      async function processTransactions(result) {
        const all_amount_tx = [];

        for (const transaction of result) {
          const txHash = transaction.hash;
          const amount = transaction.value;

          if (transaction.to.toLowerCase() === myAddress.toLowerCase()) {
            const usdt = await getEthPriceInUsdt(amount); // Assuming getEthPriceInUsdt is an async function
            all_amount_tx.push([usdt, txHash]);
          }
        }
        return all_amount_tx[all_amount_tx.length - 1];
      }

      // Call this function passing your 'result' array
      return await processTransactions(result);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    }
  }

  async function main(main_userAddress, main_api_key, main_endpoint) {
    let all_tx = await fetchTransactionHistory(
      main_userAddress,
      main_api_key,
      main_endpoint,
    );
    return all_tx;
  }

  // =========================== tx ==========================

  // token sending function
  async function send_token(user_address, token_number) {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const events = require('events');
    events.setMaxListeners(100);

    const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS; // Replace with your ERC20 token contract address
    const tokenAbi = ['function transfer(address to, uint256 amount)'];

    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);

    const recipientAddress = user_address; // Replace with recipient's address

    const amountToSend = ethers.utils.parseUnits(token_number, 18); // Sending 100 tokens

    try {
      const tx = await tokenContract.transfer(recipientAddress, amountToSend);

      return [true, tx.hash];
    } catch (error) {
      console.error('Error sending tokens:', error);
      return [false, error];
    }
  }

  // Replace 'YOUR_BOT_TOKEN' with your actual bot token
  const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

  // first time start
  bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const refferal_id = match && match[1] ? match[1].trim() : null;

    const response = await axios.get(
      `${db_api_url}/?action=start&user_id=${chatId}&refferal_id=${refferal_id}`,
    );

    if (response.data.status) {
      if (Number(refferal_id) > 0) {
        try {
          bot.sendMessage(
            '5204205237',
            `<b><code>${msg.from.username}</code> joined Meson Network through your referral link.</b>`,
            { parse_mode: 'HTML' },
          );
        } catch (error) {
          console.log('not found' + refferal_id);
        }
      }
    }

    bot.sendMessage(chatId, 'Welcome to the Meson network.').then(async () => {
      bot.sendMessage(
        chatId,
        "If you're interested in purchasing MSN tokens, click the 'Yes' button",
        {
          reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [[{ text: 'No' }, { text: 'Yes ✅' }]],
          },
        },
      );
    });

    return;
  });

  // listen for custom message
  bot.on('message', async (msg) => {
    let last_ = true;
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username;
    const messageId = msg.message_id;
    const userFirst_name = msg.from.first_name;

    const all_buttons = {
      parse_mode: 'HTML',
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
          [{ text: '🧍‍♂️ Refferal' }, { text: '📝 About MSN' }],
          [{ text: '💰 Refferal Balance' }, { text: '📤 Withdraw' }],
        ],
      },
    };

    if (
      text === 'Yes ✅' ||
      text == 'Buy ✅' ||
      text == 'Buy' ||
      text == 'Yes'
    ) {
      bot
        .sendMessage(
          chatId,
          `<b style='text:align:center;'> <b>📜 Rules</b> </b>

<i style='text:align:center;'> <i>➡️ 1 USDT = 20000 MSN</i> </i>
<i style='text:align:center;'> <i>➡️ Minimum Buy 0.1 USDT = 2000 MSN</i> </i>

<b>MSN Contract Address: <code>${token_contract_address}</code></b>

`,
          { parse_mode: 'HTML' },
        )
        .then(async () => {
          bot.sendMessage(chatId, 'To buy MSN tokens, click "Next" button', {
            reply_markup: {
              resize_keyboard: true,
              one_time_keyboard: true,
              keyboard: [[{ text: 'Cancle' }, { text: 'Next ✅' }]],
            },
          });
        });
      last_ = false;
      return;
    }

    if (text === 'Next ✅' || text == 'Next') {
      bot
        .sendMessage(chatId, `<code>${myAddress}</code>`, {
          parse_mode: 'HTML',
        })
        .then(async () => {
          bot.sendMessage(
            chatId,
            `<b style='text:align:center;'> <b>Send BNB to this <code>${myAddress}</code> with the amount you want to buy MSN tokens, <i>and send your wallet address.</i></b> </b>

<i style='text:align:center;'> <i>▶️ 1 USDT = 20000 MSN</i> </i>
<i style='text:align:center;'> <i>▶️ Minimum Buy 0.1 USDT = 2000 MSN</i> </i>

<i>Make sure the BNB sender address matches the MSN token recever address.</i>
`,
            { parse_mode: 'HTML' },
          );
        });
      last_ = false;
      return;
    }

    if (text === 'Cancle' || text == 'No') {
      const balance_message = `<b>🔥 Meson Network</b>

<b>1 Mainnet MSN = $4.5 - $8.5</b>

<b>1000 Testnet MSN : 1 Mainnet MSN</b>

<b>Mininum buy : 0.1 USDT = 2000 Testnet MSN</b>`;

      bot.sendMessage(chatId, [balance_message].join('\n\n'), {
        parse_mode: 'HTML',
        reply_markup: {
          resize_keyboard: true,
          one_time_keyboard: true,
          keyboard: [[{ text: 'No' }, { text: 'Next ✅' }]],
        },
      });

      last_ = false;
      return;
    }

    // =============== button action ============
    if (
      text == '💰 Refferal Balance' ||
      text == 'Refferal Balance' ||
      text == 'Balance'
    ) {
      const get_refferal = await axios.get(
        `${db_api_url}/?action=refferal_balance&user_id=${chatId}`,
      );

      const username = msg.from.first_name;
      const balanceMSN = get_refferal.data.message.reffer_point;

      const balance_message = `<b> 🤴 User: ${username}

🌤 Your Refferal Balance: ${balanceMSN} MSN</b>`;

      bot.sendMessage(chatId, [balance_message].join('\n\n'), all_buttons);

      last_ = false;
    }

    if (
      text == '🧍‍♂️ Refferal' ||
      text == 'Refferal' ||
      text == 'Reffer' ||
      text == 'My User'
    ) {
      const referralLink = `${bot_link}?start=${chatId}`;

      const get_refferal_data = await axios.get(
        `${db_api_url}/?action=refferal_balance&user_id=${chatId}`,
      );

      const refferal_user = get_refferal_data.data.message.my_reffer;

      bot.sendMessage(
        chatId,
        [
          `<b>🔥 Meson Network

👫 Your Refferal User: <b>${refferal_user}</b> 🧍‍♂️

🎁 Per Refer: <b>${per_reffer} MSN</b> (Minimum purchase: 2000 MSN.)

🔗 Your Refer Link = ${referralLink}</b>`,
        ].join('\n\n'),
        all_buttons,
      );

      last_ = false;
    }

    if (
      text == '📝 About MSN' ||
      text == 'About MSN' ||
      text == 'MSN' ||
      text == 'Token' ||
      text == 'Contract Address'
    ) {
      let about_msn = `<b>🔥 Meson Network</b>

<b>⛓️ Network: Sepolia Testnet</b>

<b>📜 Contract Address: <code>${token_contract_address}</code></b>`;
      bot.sendMessage(chatId, [about_msn].join('\n\n'), all_buttons);
      last_ = false;
    }

    if (
      text == '📤 Withdraw' ||
      text == 'Withdraw' ||
      text == 'Payout' ||
      text == 'Balance Withdraw'
    ) {
      const get_balance = await axios.get(
        `${db_api_url}/?action=refferal_balance&user_id=${chatId}`,
      );

      const reffer_balance = get_balance.data.message.reffer_point;

      if (reffer_balance <= 0) {
        bot.sendMessage(
          chatId,
          [
            `<b>😔 You don't have any MSN tokens. Please refer some users to earn MSN tokens.</b>`,
          ].join('\n\n'),
          all_buttons,
        );
        return;
      }

      let withdraw_address = get_balance.data.message.address;
      if (
        withdraw_address == '' ||
        withdraw_address == undefined ||
        withdraw_address == null
      ) {
        bot.sendMessage(
          chatId,
          '<b>Minimum Buy 0.1 USDT = 2000 MSN required</b>',
          { parse_mode: 'HTML' },
        );
        return;
      }

      const withdraw_balance = await axios.get(
        `${db_api_url}/?action=withdraw&user_id=${chatId}`,
      );

      if (!withdraw_balance.data.status) {
        bot.sendMessage(chatId, 'Please try again later.');
        return;
      }

      async function send_request_with() {
        let transfer_status = await send_token(
          get_balance.data.message.address,
          reffer_balance,
        );

        if (transfer_status[0]) {
          bot.sendMessage(
            chatId,
            [
              `<b> Congratulations! You have successfully withdrawn ${reffer_balance} MSN tokens 🎉 </b>`, 
              //\n\n<b>Transaction details: ${etherscan_url+transfer_status[1]} </b>
            ].join('\n\n'),
            all_buttons,
          );
        } else {
          bot.sendMessage(chatId, 'Please try again later.');
        }
      }

      send_request_with();

      last_ = false;
    }

    // =============== button action ============

    if(text == "/help" || text == "help" || text == "support"){
      bot.sendMessage(chatId, `Ask your question here: ${help_tele}`);
      last_ = false;
      return;
    }

    if (last_) {
      function isValidMetaMaskAddress(address) {
        var metaMaskAddressRegex = /^(0x)?[0-9a-fA-F]{40}$/;
        return metaMaskAddressRegex.test(address);
      }

      var address = text;

      let wallet_address_status = isValidMetaMaskAddress(address);

      try {
        if (wallet_address_status) {
          let last_tx = await main(address, API_KEY, TRANSACTION_LIST_ENDPOINT);

          if (
            last_tx == undefined ||
            last_tx == null ||
            last_tx == '' ||
            last_tx.length <= 0
          ) {
            bot.sendMessage(
              chatId,
              '<b>Please Send any amount of BNB you want to buy MSN tokens.</b>',
              { parse_mode: 'HTML' },
            );
            return;
          }

          if (last_tx[0] > 0.1) {
            let buy_amount = last_tx[0];
            let tx_hash = last_tx[1];

            let bought_msn = (msn_price * buy_amount).toFixed(2);

            const response = await axios.get(
              `${db_api_url}/?action=check_hash&hash=${tx_hash}`,
            );

            if (response) {
              const store_res = await axios.get(
                `${db_api_url}/?action=store_hash&hash=${tx_hash}&user_id=${chatId}&address=${address}&per_reffer=${per_reffer}`,
              );

              if (store_res.data.status) {
                async function send_request_with_custom() {
                  let transfer_status_custom = await send_token(
                    address,
                    bought_msn,
                  );
                  if (!transfer_status_custom[0]) {
                    bot.sendMessage(chatId, 'Please try again later.');
                    return;
                  } else {
                    bot.sendMessage(
                      chatId,
                      `Success! You've bought <b>${bought_msn} MSN</b> tokens! 🎉`,
                      //<b>Transaction details:${etherscan_url + transfer_status_custom[1]} </b>
                      {
                        parse_mode: 'HTML',
                        reply_markup: {
                          resize_keyboard: true,
                          one_time_keyboard: true,
                          keyboard: [
                            [{ text: '🧍‍♂️ Refferal' }, { text: '📝 About MSN' }],
                            [
                              { text: '💰 Refferal Balance' },
                              { text: '📤 Withdraw' },
                            ],
                          ],
                        },
                      },
                    );
                  }

                  // send message to admin 
                  bot.sendMessage(
                    '5204205237',
                    `<b>Status: ✅</b>
<b>Buy Amount: ${buy_amount} USDT</b> 
<b>User: <code>${username}</code></b>`,
                    { parse_mode: 'HTML' },
                  );
                }
                send_request_with_custom();

                const get_refferal_user = await axios.get(
                  `${db_api_url}/?action=refferal_balance&user_id=${chatId}`,
                );
                const reffer_user =
                  get_refferal_user.data.message.refferal_user;
                if (reffer_user > 0) {
                  try {
                    bot.sendMessage(
                      get_refferal_user.data.message.refferal_user,
                      `<b><code>${username}</code> purchased ${bought_msn} MSN.</b>`,
                      { parse_mode: 'HTML' },
                    );
                  } catch (error) {}
                }
              } else {
                if (store_res.data.message == 'allready hash exists.') {
                  bot.sendMessage(
                    chatId,
                    '<b>Please Send any amount of BNB you want to buy MSN tokens.</b>',
                    { parse_mode: 'HTML' },
                  );
                } else {
                  bot.sendMessage(chatId, 'Please try again later.');
                }
              }
            } else {
              bot.sendMessage(
                chatId,
                'Please Send any amount of BNB you want to buy MSN tokens.',
              );
            }
          } else {
            bot.sendMessage(chatId, 'Please send valid amount');
          }
        } else {
        }
      } catch (error) {
        console.log(error);
      }
    }
  });
} catch (error) {
  console.log(error);
}
