const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = "8651056162:AAFTBhrkoNg5Mpg-cIYj-zSmf6S5LBISgZM";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ===== VARIABLES =====
let SMS_API_KEY = "AM–MRXRPSh2PU";
let ADMIN_PASSWORD = "794082";

let state = {};
let users = {};

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

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

  const update = req.body;
  if (!update.message) return;

  const msg = update.message;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (!state[chatId]) state[chatId] = {};

  // ===== START =====
  if (text === "/start") {
    reset(chatId);
    return send(chatId, "মাহফুজের কাস্টম এসএমএস এ আপনাকে স্বাগতম 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== BACK =====
  if (text === "Back") {
    reset(chatId);
    return send(chatId, "মাহফুজের কাস্টম এসএমএস এ আপনাকে স্বাগতম 👇", [
      ["Admin Login"],
      ["User Login"]
    ]);
  }

  // ===== ADMIN LOGIN =====
  if (text === "Admin Login") {
    state[chatId] = { mode: "admin", step: "pass" };
    return send(chatId, "🔑 Enter Admin Password:");
  }

  // ===== USER LOGIN =====
  if (text === "User Login") {
    state[chatId] = { mode: "user", step: "id" };
    return send(chatId, "Enter User ID:");
  }

  // ===== ADMIN PASSWORD =====
  if (state[chatId].mode === "admin" && state[chatId].step === "pass") {
    if (text === ADMIN_PASSWORD) {
      state[chatId] = { admin: true };
      return send(chatId, "✅ Admin Panel", [
        ["User Add", "User List"],
        ["User Delete", "Coin Edit"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "❌ Wrong Password");
    }
  }

  // ===== USER LOGIN =====
  if (state[chatId].mode === "user" && state[chatId].step === "id") {
    state[chatId].loginUser = text;
    state[chatId].step = "pass";
    return send(chatId, "Enter Password:");
  }

  if (state[chatId].mode === "user" && state[chatId].step === "pass") {
    let u = users[state[chatId].loginUser];

    if (u && u.password === text) {
      state[chatId] = { user: state[chatId].loginUser };
      return send(chatId, "✅ User Panel", [
        ["Send SMS", "Balance"],
        ["Coin Buy"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "❌ Wrong Password");
    }
  }

  // ===== ADMIN PANEL =====
  if (state[chatId].admin) {

    // ===== PASSWORD CHANGE =====
    if (text === "PASSWORD CHANGE") {
      state[chatId] = { admin: true, step: "old_pass" };
      return send(chatId, "🔑 Enter Current Password:");
    }

    if (state[chatId].step === "old_pass") {
      if (text !== ADMIN_PASSWORD) return send(chatId, "❌ Wrong Password");
      state[chatId].step = "new_pass";
      return send(chatId, "Enter New Password:");
    }

    if (state[chatId].step === "new_pass") {
      state[chatId].tempPass = text;
      state[chatId].step = "confirm_pass";
      return send(chatId, "Confirm New Password:");
    }

    if (state[chatId].step === "confirm_pass") {
      if (text !== state[chatId].tempPass) {
        return send(chatId, "❌ Password not match");
      }

      ADMIN_PASSWORD = text;
      state[chatId] = { admin: true };

      return send(chatId, "✅ Password Updated", [
        ["User Add", "User List"],
        ["User Delete", "Coin Edit"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);
    }

    // ===== API EDITOR =====
    if (text === "API EDITOR") {
      state[chatId] = { admin: true, step: "api_menu" };
      return send(chatId, "🔧 API Editor", [
        ["API CHANGE", "API BALANCE"],
        ["Back"]
      ]);
    }

    if (text === "API BALANCE") {
      return send(chatId, "🔗 Check Balance:\nhttps://mahirvai.com/Balance.html");
    }

    if (text === "API CHANGE") {
      state[chatId] = { admin: true, step: "api_change_input" };

      return send(chatId,
`Current API:
https://mahirvai.com/sms.php?key=${SMS_API_KEY}&number=01XXXXXXXX&msg=XXXX

Send new API link:

Format:
https://mahirvai.com/sms.php?key=YOUR_KEY&number=01XXXXXXXX&msg=XXXX`
      );
    }

    if (state[chatId].step === "api_change_input") {
      try {
        let keyMatch = text.match(/key=([^&]+)/);
        if (!keyMatch) throw "Invalid";

        SMS_API_KEY = keyMatch[1];
        state[chatId] = { admin: true };

        return send(chatId, "✅ API Updated", [
          ["User Add", "User List"],
          ["User Delete", "Coin Edit"],
          ["API EDITOR", "PASSWORD CHANGE"],
          ["Back"]
        ]);
      } catch {
        return send(chatId, "❌ Invalid API Link");
      }
    }

    // ===== USER MANAGEMENT =====
    if (text === "User Add") {
      state[chatId].step = "add_user";
      return send(chatId, "Enter username:");
    }

    if (text === "User List") {
      let list = Object.keys(users)
        .map(u => `${u} (coin: ${users[u].coin})`)
        .join("\n");
      return send(chatId, list || "No users");
    }

    if (text === "User Delete") {
      state[chatId].step = "delete_user";
      return send(chatId, "Enter username:");
    }

    if (text === "Coin Edit") {
      state[chatId].step = "coin_user";
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
      ["User Delete", "Coin Edit"],
      ["API EDITOR", "PASSWORD CHANGE"],
      ["Back"]
    ]);
  }

  // ===== DELETE =====
  if (state[chatId].step === "delete_user") {
    if (users[text]) {
      delete users[text];
      state[chatId] = { admin: true };

      return send(chatId, "✅ Deleted", [
        ["User Add", "User List"],
        ["User Delete", "Coin Edit"],
        ["API EDITOR", "PASSWORD CHANGE"],
        ["Back"]
      ]);
    } else {
      return send(chatId, "❌ Not found");
    }
  }

  // ===== COIN EDIT =====
  if (state[chatId].step === "coin_user") {
    state[chatId].target = text;
    state[chatId].step = "coin_amount";
    return send(chatId, "Enter coin:");
  }

  if (state[chatId].step === "coin_amount") {
    let u = users[state[chatId].target];
    if (!u) return send(chatId, "❌ User not found");

    u.coin = parseInt(text);
    state[chatId] = { admin: true };

    return send(chatId, "✅ Updated", [
      ["User Add", "User List"],
      ["User Delete", "Coin Edit"],
      ["API EDITOR", "PASSWORD CHANGE"],
      ["Back"]
    ]);
  }

  // ===== USER PANEL =====
  if (state[chatId].user) {

    if (text === "Balance") {
      return send(chatId, `💰 ${users[state[chatId].user].coin}`);
    }

    if (text === "Coin Buy") {
      return send(chatId, "📩 Buy: https://t.me/MRX404BYTOWHID");
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

    axios.get("https://mahirvai.com/sms.php", {
      params: {
        key: SMS_API_KEY,
        number: state[chatId].number,
        msg: text
      }
    })
    .then(() => {
      u.coin--;
      state[chatId] = { user: state[chatId].user };

      send(chatId, "✅ SMS Sent", [
        ["Send SMS", "Balance"],
        ["Coin Buy"],
        ["Back"]
      ]);
    })
    .catch(() => {
      send(chatId, "❌ SMS Failed");
    });
  }

});

app.listen(process.env.PORT || 3000);
