const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const TOKEN = "8651056162:AAEwp5062i3fpRpvLXuyuhfpn7hjUuhJG4I";
const URL = `https://api.telegram.org/bot${TOKEN}`;

const ADMIN_PASSWORD = "794082";

// ===== DATA =====
let users = {};      // username: {password, coin}
let banned = {};
let logs = [];

// ===== USER STATE =====
let step = {};
let session = {};

// ===== SEND MESSAGE =====
async function sendMessage(chatId, text) {
  await axios.post(`${URL}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// ===== MAIN WEBHOOK =====
app.post("/", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.send();

  const chatId = msg.chat.id;
  const text = msg.text;

  // ===== START =====
  if (text === "/start") {
    step[chatId] = "choose";

    return sendMessage(chatId,
`1. Admin
2. User`);
  }

  // ===== CHOOSE =====
  if (step[chatId] === "choose") {
    if (text == "1") {
      step[chatId] = "admin_pass";
      return sendMessage(chatId, "Enter Admin Password:");
    }
    if (text == "2") {
      step[chatId] = "user_login";
      return sendMessage(chatId, "Enter username:");
    }
  }

  // ===== ADMIN LOGIN =====
  if (step[chatId] === "admin_pass") {
    if (text === ADMIN_PASSWORD) {
      step[chatId] = "admin_panel";
      return sendMessage(chatId,
`Admin Panel:
1. Add User
2. Delete User
3. Ban User
4. Set Coin
5. View Logs`);
    } else {
      return sendMessage(chatId, "Wrong Password ❌");
    }
  }

  // ===== ADMIN PANEL =====
  if (step[chatId] === "admin_panel") {
    if (text == "1") {
      step[chatId] = "add_user";
      return sendMessage(chatId, "Send: username password");
    }
    if (text == "2") {
      step[chatId] = "delete_user";
      return sendMessage(chatId, "Enter username:");
    }
    if (text == "3") {
      step[chatId] = "ban_user";
      return sendMessage(chatId, "Enter username:");
    }
    if (text == "4") {
      step[chatId] = "set_coin";
      return sendMessage(chatId, "Send: username coin");
    }
    if (text == "5") {
      let all = logs.join("\n") || "No logs";
      return sendMessage(chatId, all);
    }
  }

  // ===== ADD USER =====
  if (step[chatId] === "add_user") {
    let [u, p] = text.split(" ");
    users[u] = { password: p, coin: 10 };
    step[chatId] = "admin_panel";
    return sendMessage(chatId, "User Added ✅");
  }

  // ===== DELETE USER =====
  if (step[chatId] === "delete_user") {
    delete users[text];
    step[chatId] = "admin_panel";
    return sendMessage(chatId, "User Deleted ❌");
  }

  // ===== BAN USER =====
  if (step[chatId] === "ban_user") {
    banned[text] = true;
    step[chatId] = "admin_panel";
    return sendMessage(chatId, "User Banned 🚫");
  }

  // ===== SET COIN =====
  if (step[chatId] === "set_coin") {
    let [u, c] = text.split(" ");
    if (users[u]) users[u].coin = parseInt(c);
    step[chatId] = "admin_panel";
    return sendMessage(chatId, "Coin Updated 💰");
  }

  // ===== USER LOGIN =====
  if (step[chatId] === "user_login") {
    session[chatId] = { username: text };
    step[chatId] = "user_pass";
    return sendMessage(chatId, "Enter password:");
  }

  if (step[chatId] === "user_pass") {
    let u = session[chatId].username;

    if (!users[u] || users[u].password !== text) {
      return sendMessage(chatId, "Login Failed ❌");
    }

    if (banned[u]) {
      return sendMessage(chatId, "You are banned 🚫");
    }

    session[chatId].login = true;
    step[chatId] = "user_menu";

    return sendMessage(chatId,
`Welcome ${u}
Coin: ${users[u].coin}

Send Number:`);
  }

  // ===== USER SEND SMS =====
  if (step[chatId] === "user_menu") {
    session[chatId].number = text;
    step[chatId] = "sms_text";
    return sendMessage(chatId, "Send SMS text:");
  }

  if (step[chatId] === "sms_text") {
    let u = session[chatId].username;

    if (users[u].coin <= 0) {
      return sendMessage(chatId, "No coin ❌");
    }

    // ===== FAKE SMS API (EDIT HERE) =====
    console.log("SMS Sent:", session[chatId].number, text);

    users[u].coin--;

    logs.push(`${u} → ${session[chatId].number} → ${text}`);

    step[chatId] = "again";

    return sendMessage(chatId, "SMS Sent ✅\nSend again? (yes/no)");
  }

  if (step[chatId] === "again") {
    if (text.toLowerCase() === "yes") {
      step[chatId] = "user_menu";
      return sendMessage(chatId, "Enter Number:");
    } else {
      step[chatId] = "choose";
      return sendMessage(chatId, "Done ✅\n/start again");
    }
  }

  res.send();
});

// ===== SERVER =====
app.get("/", (req, res) => {
  res.send("Bot Running...");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server Started");
});
