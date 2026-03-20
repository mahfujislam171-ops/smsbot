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

// 👉 SMS API
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
  state[id] = {};
  if (!users[id]) users[id] = { coin: 0, name: "User" };

  send(id, "👇 Please Select Your Choice", [
    ["📨 Send Custom Sms"],
    ["🎁 Gift Coin", "💌 Redeem Code"],
    ["👤 My Account"],
    ["🎉 Bonus", "👥 Admin Panel"]
  ]);
}

// ===== BACK SYSTEM =====
function goBack(id) {
  state[id].step = null;
  return home(id);
}

// ===== SERVER =====
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id;
  const text = msg.text;

  if (!state[id]) state[id] = {};
  if (!users[id]) users[id] = { coin: 0, name: "User" };

  // ===== START =====
  if (text === "/start") return home(id);

  // ===== BACK =====
  if (text === "Back") return goBack(id);

  // ===== ADMIN PANEL =====
  if (text === "👥 Admin Panel") {
    state[id] = { step: "admin_pass" };
    return send(id, "🔐 Enter Admin Password:", [["Back"]]);
  }

  if (state[id].step === "admin_pass") {
    if (text !== adminPass)
      return send(id, "❌ Wrong Password");

    state[id].step = "admin_menu";

    return send(id, "✅ Admin Panel", [
      ["👤 User List"],
      ["🎟 Generate Code"],
      ["Back"]
    ]);
  }

  // ===== USER LIST =====
  if (state[id].step === "admin_menu" && text === "👤 User List") {
    let list = Object.keys(users)
      .map(u => `${u} = ${users[u].coin}`)
      .join("\n");

    return send(id, list || "No users", [["Back"]]);
  }

  // ===== GENERATE CODE =====
  if (state[id].step === "admin_menu" && text === "🎟 Generate Code") {
    state[id].step = "gen_coin";
    return send(id, "Enter Coin Amount:", [["Back"]]);
  }

  if (state[id].step === "gen_coin") {
    let amount = parseInt(text);

    let code = Math.random().toString(36).substring(2, 10).toUpperCase();

    codes[code] = {
      coin: amount,
      used: false
    };

    state[id].step = "admin_menu";

    return send(id, `✅ Code Generated\n\nCode: ${code}\nCoin: ${amount}`, [["Back"]]);
  }

  // ===== REDEEM =====
  if (text === "💌 Redeem Code") {
    state[id].step = "redeem";
    return send(id, "Enter Code:", [["Back"]]);
  }

  if (state[id].step === "redeem") {
    let c = codes[text];

    if (!c) return send(id, "❌ Invalid Code");

    if (c.used) return send(id, "❌ Already Used");

    users[id].coin += c.coin;
    c.used = true;

    state[id].step = null;

    return send(id, `✅ Redeemed ${c.coin} Coin`);
  }

  // ===== ACCOUNT =====
  if (text === "👤 My Account") {
    let u = users[id];

    return send(id,
`👤 Hello ${u.name}
🆔 ID: ${id}
💰 Balance: ${u.coin}`);
  }

  // ===== BONUS (ANTI SPAM) =====
  if (text === "🎉 Bonus") {
    let now = Date.now();

    if (!users[id].lastBonus)
      users[id].lastBonus = 0;

    if (now - users[id].lastBonus < 86400000) {
      return send(id, "⏳ Already claimed today");
    }

    users[id].lastBonus = now;
    users[id].coin += 1;

    return send(id, "🎉 1 Coin Added");
  }

  // ===== SMS =====
  if (text === "📨 Send Custom Sms") {
    state[id].step = "num";
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

      state[id].step = null;

      return send(id, "✅ SMS Sent");
    } catch {
      return send(id, "❌ API Error");
    }
  }

});

app.listen(process.env.PORT || 3000);
