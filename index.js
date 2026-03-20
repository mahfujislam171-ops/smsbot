const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAFONElzDzw2YKcMqvQdJZ76htnzRHQQ8Jk";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ===== DATA =====
let users = {};
let state = {};
let codes = {};
let adminPass = "794082";

// ===== SMS API =====
let apiLink = "https://mahirvai.com/sms.php?key=XXX&number=01XXXXXXXX&msg=XXXX";

// ===== SEND =====
function send(id, text, keyboard) {
  axios.post(`${API}/sendMessage`, {
    chat_id: id,
    text,
    reply_markup: keyboard
      ? { keyboard, resize_keyboard: true }
      : undefined,
  }).catch(() => {});
}

// ===== HOME =====
function home(id) {
  state[id] = { page: "home" };
  if (!users[id]) users[id] = { coin: 0 };

  send(id, "👇 Please Select Your Choice", [
    ["📨 Send Custom Sms"],
    ["🎁 Gift Coin", "💌 Redeem Code"],
    ["👤 My Account"],
    ["🎉 Bonus", "👥 Admin Panel"]
  ]);
}

// ===== BACK SYSTEM (FIXED) =====
function goBack(id) {
  let page = state[id].page;

  if (page === "admin_menu") return adminMenu(id);
  if (page === "gen_code") return adminMenu(id);
  if (page === "user_manage") return adminMenu(id);

  return home(id);
}

// ===== ADMIN MENU =====
function adminMenu(id) {
  state[id] = { page: "admin_menu" };

  send(id, "✅ Admin Panel", [
    ["👤 User List"],
    ["🎟 Generate Code"],
    ["Back"]
  ]);
}

// ===== SERVER =====
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text;

  if (!state[id]) state[id] = {};
  if (!users[id]) users[id] = { coin: 0 };

  // ===== START =====
  if (text === "/start") return home(id);

  // ===== BACK =====
  if (text === "Back") return goBack(id);

  // ===== ADMIN LOGIN =====
  if (text === "👥 Admin Panel") {
    state[id] = { step: "admin_pass", page: "admin_login" };
    return send(id, "🔐 Enter Admin Password:", [["Back"]]);
  }

  if (state[id].step === "admin_pass") {
    if (text !== adminPass)
      return send(id, "❌ Wrong Password");

    return adminMenu(id);
  }

  // ===== USER LIST + DELETE =====
  if (state[id].page === "admin_menu" && text === "👤 User List") {
    let list = Object.keys(users);

    if (!list.length) return send(id, "No users", [["Back"]]);

    state[id] = { page: "user_manage" };

    return send(id, "Select User:", [
      ...list.map(u => [u]),
      ["Back"]
    ]);
  }

  if (state[id].page === "user_manage") {

    if (users[text]) {
      state[id].target = text;
      state[id].page = "user_action";

      return send(id, `User: ${text}`, [
        ["❌ Delete User"],
        ["Back"]
      ]);
    }
  }

  if (state[id].page === "user_action" && text === "❌ Delete User") {
    delete users[state[id].target];
    return adminMenu(id);
  }

  // ===== GENERATE CODE =====
  if (state[id].page === "admin_menu" && text === "🎟 Generate Code") {
    state[id] = { page: "gen_code" };
    return send(id, "Enter Coin Amount:", [["Back"]]);
  }

  if (state[id].page === "gen_code") {
    let amount = parseInt(text);

    let random = Math.random().toString(36).substring(2, 6).toUpperCase();
    let code = `TABASSUM-${random}`;

    codes[code] = {
      coin: amount,
      used: false
    };

    state[id].page = "admin_menu";

    return send(id,
`✅ Code Generated

Code: ${code}
Coin: ${amount}`, [["Back"]]);
  }

  // ===== REDEEM =====
  if (text === "💌 Redeem Code") {
    state[id] = { step: "redeem", page: "redeem" };
    return send(id, "Enter Code:", [["Back"]]);
  }

  if (state[id].step === "redeem") {
    let c = codes[text];

    if (!c) return send(id, "❌ Invalid Code");
    if (c.used) return send(id, "❌ Already Used");

    users[id].coin += c.coin;
    c.used = true;

    return home(id);
  }

  // ===== GIFT COIN (FIXED) =====
  if (text === "🎁 Gift Coin") {
    state[id] = { step: "gift", page: "gift" };
    return send(id, "Enter Coin Amount:", [["Back"]]);
  }

  if (state[id].step === "gift") {
    let amount = parseInt(text);

    let random = Math.random().toString(36).substring(2, 6).toUpperCase();
    let code = `TABASSUM-${random}`;

    codes[code] = {
      coin: amount,
      used: false
    };

    state[id] = {};

    return send(id,
`🎁 YOUR CODE

Code: ${code}
Coin: ${amount}`);
  }

  // ===== ACCOUNT =====
  if (text === "👤 My Account") {
    return send(id,
`👤 ID: ${id}
💰 Balance: ${users[id].coin}`);
  }

  // ===== BONUS =====
  if (text === "🎉 Bonus") {
    let now = Date.now();

    if (!users[id].lastBonus) users[id].lastBonus = 0;

    if (now - users[id].lastBonus < 86400000)
      return send(id, "⏳ Already claimed");

    users[id].lastBonus = now;
    users[id].coin += 1;

    return send(id, "🎉 Bonus Added");
  }

  // ===== SMS =====
  if (text === "📨 Send Custom Sms") {
    state[id] = { step: "num", page: "sms" };
    return send(id, "Enter Number:", [["Back"]]);
  }

  if (state[id].step === "num") {
    state[id].num = text;
    state[id].step = "msg";
    return send(id, "Enter Message:", [["Back"]]);
  }

  if (state[id].step === "msg") {

    if (users[id].coin <= 0)
      return send(id, "❌ No Coin");

    let url = apiLink
      .replace("01XXXXXXXX", state[id].num)
      .replace("XXXX", text);

    try {
      await axios.get(url);
      users[id].coin--;

      return home(id);

    } catch {
      return send(id, "❌ API Error");
    }
  }

});

app.listen(process.env.PORT || 3000);
