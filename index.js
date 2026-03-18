const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAFoTNM6DHlUJv4CLhR8GKF_62FWLASFImk";
const API = `https://api.telegram.org/bot${TOKEN}`;

let state = {};
let users = {};

// ===== SEND =====
function send(chatId, text, keyboard) {
  axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text,
    reply_markup: keyboard
      ? { keyboard, resize_keyboard: true }
      : undefined,
  }).catch(() => {});
}

// ===== RESET =====
function reset(chatId) {
  state[chatId] = {};
}

// ===== WEBHOOK =====
app.post("/", (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!state[chatId]) state[chatId] = {};

  // ===== START =====
  if (text === "/start") {
    reset(chatId);
    return send(chatId, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== BACK =====
  if (text === "Back") {
    reset(chatId);
    return send(chatId, "Welcome 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    reset(chatId);
    state[chatId].step = "admin_pass";
    return send(chatId, "🔑 Enter Admin Password:");
  }

  if (state[chatId].step === "admin_pass") {
    if (text === "794082") {
      state[chatId] = { admin: true };
      return send(chatId, "✅ Admin Panel", [
        ["User Add", "User List"],
        ["Coin Add", "Coin Edit"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "❌ Wrong Password");
    }
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    reset(chatId);
    state[chatId].step = "user_id";
    return send(chatId, "Enter User ID:");
  }

  if (state[chatId].step === "user_id") {
    state[chatId].loginUser = text;
    state[chatId].step = "user_pass";
    return send(chatId, "Enter Password:");
  }

  if (state[chatId].step === "user_pass") {
    let u = users[state[chatId].loginUser];

    if (u && u.password === text) {
      state[chatId] = { user: state[chatId].loginUser };
      return send(chatId, "✅ User Panel", [
        ["Send SMS", "Balance"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "❌ Wrong Password");
    }
  }

  // ===== ADMIN PANEL =====
  if (state[chatId].admin) {

    if (text === "User Add") {
      state[chatId] = { admin: true, step: "add_user" };
      return send(chatId, "Enter username:");
    }

    if (text === "User List") {
      let list = Object.keys(users)
        .map(u => `${u} (coin: ${users[u].coin})`)
        .join("\n");

      return send(chatId, list || "No users");
    }

    if (text === "Coin Add") {
      state[chatId] = { admin: true, step: "coin_add_user" };
      return send(chatId, "Enter username:");
    }

    if (text === "Coin Edit") {
      state[chatId] = { admin: true, step: "coin_edit_user" };
      return send(chatId, "Enter username:");
    }
  }

  // ===== USER ADD =====
  if (state[chatId].step === "add_user") {
    state[chatId].tempUser = text;
    state[chatId].step = "add_pass";
    return send(chatId, "Enter password:");
  }

  if (state[chatId].step === "add_pass") {
    users[state[chatId].tempUser] = {
      password: text,
      coin: 5
    };

    state[chatId] = { admin: true };

    return send(chatId, "✅ User Created", [
      ["User Add", "User List"],
      ["Coin Add", "Coin Edit"],
      ["Back"]
    ]);
  }

  // ===== COIN ADD =====
  if (state[chatId].step === "coin_add_user") {
    state[chatId].target = text;
    state[chatId].step = "coin_add_amount";
    return send(chatId, "Enter amount:");
  }

  if (state[chatId].step === "coin_add_amount") {
    let u = users[state[chatId].target];
    if (!u) return send(chatId, "❌ User not found");

    let amount = parseInt(text);
    if (isNaN(amount)) return send(chatId, "❌ Invalid");

    u.coin += amount;
    state[chatId] = { admin: true };

    return send(chatId, `✅ Coin Added (${u.coin})`, [
      ["User Add", "User List"],
      ["Coin Add", "Coin Edit"],
      ["Back"]
    ]);
  }

  // ===== COIN EDIT =====
  if (state[chatId].step === "coin_edit_user") {
    state[chatId].target = text;
    state[chatId].step = "coin_edit_amount";
    return send(chatId, "Enter new coin:");
  }

  if (state[chatId].step === "coin_edit_amount") {
    let u = users[state[chatId].target];
    if (!u) return send(chatId, "❌ User not found");

    let amount = parseInt(text);
    if (isNaN(amount)) return send(chatId, "❌ Invalid");

    u.coin = amount;
    state[chatId] = { admin: true };

    return send(chatId, `✅ Coin Updated (${u.coin})`, [
      ["User Add", "User List"],
      ["Coin Add", "Coin Edit"],
      ["Back"]
    ]);
  }

  // ===== USER PANEL =====
  if (state[chatId].user) {

    if (text === "Balance") {
      return send(chatId, `💰 ${users[state[chatId].user].coin}`);
    }

    if (text === "Send SMS") {
      state[chatId].step = "sms_number";
      return send(chatId, "Enter Number:");
    }
  }

  // ===== SMS =====
  if (state[chatId].step === "sms_number") {
    state[chatId].number = text;
    state[chatId].step = "sms_msg";
    return send(chatId, "Enter Message:");
  }

  if (state[chatId].step === "sms_msg") {
    let u = users[state[chatId].user];

    if (u.coin <= 0) return send(chatId, "❌ No Coin");

    axios.get(`https://mahirvai.com/sms.php?key=AM–MRXRPSh2PU&number=${state[chatId].number}&msg=${encodeURIComponent(text)}`)
    .then(() => {
      u.coin--;
      state[chatId] = { user: state[chatId].user };

      send(chatId, "✅ SMS Sent", [
        ["Send SMS", "Balance"],
        ["Back"]
      ]);
    })
    .catch(() => {
      send(chatId, "❌ SMS Failed");
    });
  }

});

app.listen(process.env.PORT || 3000);
