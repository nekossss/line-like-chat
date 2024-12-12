// ***** 設定項目 *****
// あなたのGoogleスプレッドシートをウェブに公開し、CSV形式のURLを取得してください
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOpH43k0f6Cc0Qn1gzXsnJNDybSce7CTW1hOWBgvTJIfTPuaZsEpcbO1u9E7CIQSSGzAHa4ZST7fFw/pub?output=csv";

// 会話データを格納する配列
let conversations = [];

// 現在の会話位置を示すID
let currentId = 1;

// ページ読み込み時にデータ取得
window.addEventListener("load", async () => {
  const container = document.getElementById("messageContainer");
  container.textContent = "データ取得中...";

  try {
    const response = await fetch(SPREADSHEET_URL);
    const csvText = await response.text();
    const rows = csvText.split("\n").map(r => r.split(","));

    // rows[0]はヘッダー想定：A列=id, B列=speaker, C列=message, D〜M列=制御列
    // D〜M列は最大で10列（D,E,F,G,H,I,J,K,L,M）があるとして仮定(合計13列)
    // 実際のスプレッドシート列数に合わせて修正すること
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // 行が空または列数が足りない場合スキップ
      if (row.length < 3 || !row[0]) continue;

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

    container.textContent = "";
    // 最初のメッセージ表示
    displayMessages(currentId);

  } catch (err) {
    console.error(err);
    const container = document.getElementById("messageContainer");
    container.textContent = "データ取得失敗。URLや公開設定を確認してください。";
  }
});

function displayMessages(startId) {
  const startIndex = conversations.findIndex(c => c.id === startId);
  if (startIndex === -1) {
    console.warn("指定したIDの会話が見つかりません:", startId);
    return;
  }

  const startRow = conversations[startIndex];
  const currentSpeaker = startRow.speaker;

  // 同一話者連続メッセージをまとめる
  let combinedMessage = startRow.message;
  let endIndex = startIndex;

  for (let i = startIndex + 1; i < conversations.length; i++) {
    const nextRow = conversations[i];
    if (nextRow.speaker === currentSpeaker && isControlColumnsEmpty(nextRow)) {
      // 同一speakerかつD〜M列が全て空なら連続メッセージとみなす
      combinedMessage += "\n" + nextRow.message;
      endIndex = i;
    } else {
      break;
    }
  }

  // メッセージ表示
  addMessageToChat(currentSpeaker, combinedMessage);

  // endIndex行の制御列を見て分岐
  const finalRow = conversations[endIndex];
  handleNextAction(finalRow);
}

function isControlColumnsEmpty(row) {
  return (
    row.input === "" &&
    row.answer === "" &&
    row.TrueId === "" &&
    row.NGid === "" &&
    row.choice1 === "" &&
    row.choice2 === "" &&
    row.choice3 === "" &&
    row.nextId1 === "" &&
    row.nextId2 === "" &&
    row.nextId3 === ""
  );
}

function addMessageToChat(speaker, text) {
  const container = document.getElementById("messageContainer");
  const div = document.createElement("div");
  div.className = "message-bubble";
  // 一旦シンプルに表示
  div.textContent = speaker + ": " + text;
  container.appendChild(div);

  // 最下部へスクロール
  container.scrollTop = container.scrollHeight;
}

function handleNextAction(row) {
  const inputArea = document.getElementById("inputArea");
  const choicesArea = document.getElementById("choicesArea");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  // いったん全部非表示・無効化してから必要なものだけ表示
  inputArea.style.display = "none";
  choicesArea.style.display = "none";

  // 自由入力判定
  if (row.input && row.input === "自由入力") {
    // 自由入力のUIを有効化
    inputArea.style.display = "block";
    sendBtn.onclick = () => {
      const answer = userInput.value.trim();
      if (answer === row.answer) {
        // 正解
        if (row.TrueId) {
          currentId = parseInt(row.TrueId, 10);
          userInput.value = "";
          displayMessages(currentId);
        }
      } else {
        // 不正解
        if (row.NGid) {
          currentId = parseInt(row.NGid, 10);
          userInput.value = "";
          displayMessages(currentId);
        }
      }
    };
    return;
  }

  // 選択肢判定（choice1,2,3があれば表示）
  if (row.choice1 || row.choice2 || row.choice3) {
    choicesArea.innerHTML = "";
    choicesArea.style.display = "block";

    // 選択肢を配列化
    const choices = [];
    if (row.choice1) choices.push({text: row.choice1, nextId: row.nextId1});
    if (row.choice2) choices.push({text: row.choice2, nextId: row.nextId2});
    if (row.choice3) choices.push({text: row.choice3, nextId: row.nextId3});

    choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.textContent = choice.text;
      btn.style.display = "block"; // 縦並び
      btn.onclick = () => {
        if (choice.nextId) {
          currentId = parseInt(choice.nextId, 10);
          displayMessages(currentId);
        }
      };
      choicesArea.appendChild(btn);
    });

    return;
  }

  // ここまで来たら次へ進む指示がない場合は、次のIDへ進むか終了処理
  // ここでは単純にID+1に進む例（実際はシナリオに応じて処理）
  const nextIndex = conversations.findIndex(c => c.id === row.id + 1);
  if (nextIndex !== -1) {
    currentId = row.id + 1;
    displayMessages(currentId);
  } else {
    // 会話終了
    addMessageToChat("システム", "会話が終了しました");
  }
}
