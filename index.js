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
let banned = {};
let adminPass = "794082";

const OWNER = "6079418217";

// ===== API =====
let apiLink = "https://mahirvai.com/sms.php?key=AM–MRXRPSh2PU&number=01XXXXXXXX&msg=XXXX";

// ===== SEND =====
function send(id, text, keyboard) {
  axios.post(`${API}/sendMessage`, {
    chat_id: id,
    text,
    parse_mode: "Markdown",
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

// ===== BACK =====
function goBack(id) {
  let page = state[id].page;

  if (page === "admin_menu") return home(id);
  if (page === "admin_login") return home(id);
  if (page === "gen_code") return adminMenu(id);
  if (page === "user_manage") return adminMenu(id);
  if (page === "unused") return adminMenu(id);

  return home(id);
}

// ===== ADMIN MENU =====
function adminMenu(id) {
  state[id] = { page: "admin_menu" };

  send(id, "✅ Admin Panel", [
    ["👤 User List"],
    ["🎟 Generate Code"],
    ["📦 Unused Codes"],
    ["Back"]
  ]);
}

// ===== SERVER =====
app.post("/", async (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const id = msg.chat.id.toString();
  const text = msg.text;

  if (!state[id]) state[id] = {};
  if (!users[id]) users[id] = { coin: 0 };

  // ===== BAN CHECK =====
  if (banned[id] && Date.now() < banned[id]) {
    return send(id, "⛔ You are banned for 24 hours");
  }

  // START
  if (text === "/start") return home(id);

  // BACK
  if (text === "Back") return goBack(id);

  // ===== ADMIN LOGIN =====
  if (text === "👥 Admin Panel") {
    state[id] = { step: "admin_pass", page: "admin_login" };
    return send(id, "🔐 Enter Admin Password:", [["Back"]]);
  }

  if (state[id].step === "admin_pass") {
    if (text !== adminPass) {

      if (id !== OWNER) {
        banned[id] = Date.now() + 24 * 60 * 60 * 1000;
      }

      return send(id, "❌ Wrong Password\n🚫 Banned 24 Hours");
    }

    return adminMenu(id);
  }

  // ===== USER LIST =====
  if (state[id].page === "admin_menu" && text === "👤 User List") {
    let list = Object.keys(users)
      .map(u => `${u} = ${users[u].coin}`)
      .join("\n");

    return send(id, list || "No users", [["Back"]]);
  }

  // ===== UNUSED CODES =====
  if (state[id].page === "admin_menu" && text === "📦 Unused Codes") {

    let list = Object.keys(codes)
      .filter(c => !codes[c].used)
      .map(c => `\`${c}\` = ${codes[c].coin}`)
      .join("\n");

    state[id].page = "unused";

    return send(id, list || "No unused code", [["Back"]]);
  }

  // ===== GENERATE CODE =====
  if (state[id].page === "admin_menu" && text === "🎟 Generate Code") {
    state[id] = { page: "gen_code" };
    return send(id, "Enter Coin Amount:", [["Back"]]);
  }

  if (state[id].page === "gen_code") {
    let amount = parseInt(text);

    if (!amount || amount <= 0)
      return send(id, "❌ Invalid Amount");

    let code = "TABASSUM-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    codes[code] = { coin: amount, used: false };

    state[id].page = "admin_menu";

    return send(id,
`✅ Code Generated

\`${code}\`

💰 Coin: ${amount}`, [["Back"]]);
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

    return send(id, `✅ ${c.coin} Coin Added`);
  }

  // ===== GIFT =====
  if (text === "🎁 Gift Coin") {

    if (users[id].coin <= 0)
      return send(id, "❌ No Coin");

    state[id] = { step: "gift", page: "gift" };
    return send(id, "Enter Coin Amount:", [["Back"]]);
  }

  if (state[id].step === "gift") {

    let amount = parseInt(text);

    if (!amount || amount <= 0)
      return send(id, "❌ Invalid Amount");

    if (users[id].coin < amount)
      return send(id, "❌ Not Enough Coin");

    users[id].coin -= amount;

    let code = "TABASSUM-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    codes[code] = { coin: amount, used: false };

    state[id] = {};

    return send(id,
`🎁 YOUR CODE

\`${code}\`

💰 Coin: ${amount}`);
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
      .replace("XXXX", encodeURIComponent(text));

    try {
      await axios.get(url);
      users[id].coin--;

      return send(id, "✅ SMS Sent");

    } catch {
      return send(id, "❌ API Error");
    }
  }

});

app.listen(process.env.PORT || 3000);
