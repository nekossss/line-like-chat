// 後でスプレッドシートのURLをここに入れます
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOpH43k0f6Cc0Qn1gzXsnJNDybSce7CTW1hOWBgvTJIfTPuaZsEpcbO1u9E7CIQSSGzAHa4ZST7fFw/pub?output=csv";

// データを格納するための変数
let conversations = [];

// ページが読み込まれたらデータ取得
window.addEventListener("load", () => {
  fetchData().then(() => {
    // データ取得後、最初のメッセージ表示
    displayMessages(1);  // id=1からスタートする例
  });
});

async function fetchData() {
  // ここではCSVを想定。JSONでも方法はありますが、CSVの方が設定しやすい場合が多い
  // Papaparseというライブラリを使うと便利ですが、ここでは簡略化します
  const response = await fetch(SPREADSHEET_URL);
  const text = await response.text();

  // CSVを行ごとに分解
  const rows = text.split("\n").map(r => r.split(","));
  
  // 1行目がヘッダーとして、
  // 例： A列:id, B列:speaker, C列:message, D〜M:制御列 という前提で処理
  // rows[0]はヘッダーなのでスキップして、rows[1]以降をデータ化
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // 空行対策
    if (row.length < 3) continue;

    conversations.push({
      id: parseInt(row[0], 10),
      speaker: row[1],
      message: row[2],
      input: row[3] || "",
      answer: row[4] || "",
      TrueId: row[5] || "",
      NGid: row[6] || "",
      choice1: row[7] || "",
      choice2: row[8] || "",
      choice3: row[9] || "",
      nextId1: row[10] || "",
      nextId2: row[11] || "",
      nextId3: row[12] || ""
    });
  }
}

function displayMessages(startId) {
  const startIndex = conversations.findIndex(c => c.id === startId);
  if (startIndex === -1) return;

  const startRow = conversations[startIndex];
  const currentSpeaker = startRow.speaker;

  // 同一話者連続メッセージをまとめる
  let combinedMessage = startRow.message;
  let endIndex = startIndex;

  for (let i = startIndex + 1; i < conversations.length; i++) {
    const nextRow = conversations[i];
    // D〜M列が空の判定（ここでは簡易的にすべて""であるかどうかチェック）
    const controlEmpty = nextRow.input === "" && nextRow.answer === "" && 
                         nextRow.TrueId === "" && nextRow.NGid === "" &&
                         nextRow.choice1 === "" && nextRow.choice2 === "" && 
                         nextRow.choice3 === "" && nextRow.nextId1 === "" &&
                         nextRow.nextId2 === "" && nextRow.nextId3 === "";

    if (nextRow.speaker === currentSpeaker && controlEmpty) {
      combinedMessage += "\n" + nextRow.message;
      endIndex = i;
    } else {
      break;
    }
  }

  addMessageToChat(currentSpeaker, combinedMessage);
}

function addMessageToChat(speaker, text) {
  const container = document.getElementById("messageContainer");
  const div = document.createElement("div");
  div.className = "message-bubble";
  div.textContent = speaker + ": " + text;
  container.appendChild(div);
}
