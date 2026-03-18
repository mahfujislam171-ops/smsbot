const express = require("express");
const app = express();
const axios = require("axios");

const TOKEN = "8651056162:AAEwp5062i3fpRpvLXuyuhfpn7hjUuhJG4I";
const URL = `https://api.telegram.org/bot${TOKEN}`;

app.use(express.json());

// ===== DATA =====
let adminPass = "794082";
let users = {}; // {username: {pass, coin}}
let banned = {};
let logs = [];

// ===== STATE =====
let step = {};
let temp = {};

app.post("/", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text;

    // START
    if (text === "/start") {
      step[chatId] = "menu";
      return send(chatId, "1️⃣ Admin\n2️⃣ User");
    }

    // ===== ADMIN =====
    if (text === "1" || text === "Admin") {
      step[chatId] = "admin_pass";
      return send(chatId, "Enter Admin Password:");
    }

    if (step[chatId] === "admin_pass") {
      if (text === adminPass) {
        step[chatId] = "admin_panel";
        return send(chatId,
`Admin Panel:
1 Add User
2 Delete User
3 Ban User
4 Set Coin
5 Logs`);
      } else {
        return send(chatId, "Wrong Password ❌");
      }
    }

    if (step[chatId] === "admin_panel") {
      if (text === "1") {
        step[chatId] = "add_user";
        return send(chatId, "Send: username,password");
      }
      if (text === "2") {
        step[chatId] = "del_user";
        return send(chatId, "Send username:");
      }
      if (text === "3") {
        step[chatId] = "ban_user";
        return send(chatId, "Send username:");
      }
      if (text === "4") {
        step[chatId] = "set_coin_user";
        return send(chatId, "Send username:");
      }
      if (text === "5") {
        return send(chatId, logs.join("\n") || "No logs");
      }
    }

    // ADD USER
    if (step[chatId] === "add_user") {
      let [u, p] = text.split(",");
      users[u] = { pass: p, coin: 0 };
      return send(chatId, "User Added ✅");
    }

    // DELETE USER
    if (step[chatId] === "del_user") {
      delete users[text];
      return send(chatId, "User Deleted ❌");
    }

    // BAN USER
    if (step[chatId] === "ban_user") {
      banned[text] = true;
      return send(chatId, "User Banned 🚫");
    }

    // SET COIN
    if (step[chatId] === "set_coin_user") {
      temp[chatId] = text;
      step[chatId] = "set_coin_value";
      return send(chatId, "Send coin amount:");
    }

    if (step[chatId] === "set_coin_value") {
      let user = temp[chatId];
      if (users[user]) {
        users[user].coin = parseInt(text);
        return send(chatId, "Coin Updated 💰");
      } else {
        return send(chatId, "User not found ❌");
      }
    }

    // ===== USER =====
    if (text === "2" || text === "User") {
      step[chatId] = "user_login";
      return send(chatId, "Send: username,password");
    }

    if (step[chatId] === "user_login") {
      let [u, p] = text.split(",");

      if (banned[u]) return send(chatId, "You are banned ❌");

      if (users[u] && users[u].pass === p) {
        step[chatId] = "send_number";
        temp[chatId] = { user: u };
        return send(chatId, `Login Success ✅\nCoin: ${users[u].coin}\nSend Number:`);
      } else {
        return send(chatId, "Wrong Login ❌");
      }
    }

    // NUMBER INPUT
    if (step[chatId] === "send_number") {
      let data = temp[chatId];
      data.number = text;
      temp[chatId] = data;
      step[chatId] = "send_msg";
      return send(chatId, "Enter Message:");
    }

    // SEND SMS API
    if (step[chatId] === "send_msg") {
      let data = temp[chatId];
      let user = data.user;
      let number = data.number;
      let message = text;

      if (users[user].coin <= 0) {
        return send(chatId, "No Coin ❌");
      }

      try {
        let api = `https://mahirvai.com/sms.php?key=AM-MRXRPSh2PU&number=${number}&msg=${encodeURIComponent(message)}`;

        await axios.get(api);

        users[user].coin -= 1;
        logs.push(`${user} => ${number} => ${message}`);

        step[chatId] = "again";

        return send(chatId, "📤 SMS Sent Successfully ✅\nSend again? (yes/no)");

      } catch (e) {
        return send(chatId, "SMS Failed ❌");
      }
    }

    // AGAIN
    if (step[chatId] === "again") {
      if (text.toLowerCase() === "yes") {
        step[chatId] = "send_number";
        return send(chatId, "Send Number:");
      } else {
        return send(chatId, "Done ✅");
      }
    }

    return res.sendStatus(200);

  } catch (err) {
    console.log(err);
    return res.sendStatus(200);
  }
});

// SEND FUNCTION
async function send(chatId, text) {
  await axios.post(`${URL}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// PORT FIX
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Bot Running...");
});
