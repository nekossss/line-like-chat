async function loadMessage(currentId, choiceIndex) {
  let url = `${API_URL}?currentId=${currentId}`;
  if (choiceIndex !== undefined) {
    url += `&choiceIndex=${choiceIndex}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    addMessage("エラーが発生しました: " + data.error, true);
    return;
  }

  const isSystemMessage = data.speaker && data.speaker.trim() !== "";

  if (data.speaker && data.speaker.trim() !== "") {
    addSpeakerName(data.speaker);
  }

  addMessage(data.message, isSystemMessage);

  clearChoices();

  // 分岐がなく、choicesが無い場合、次のidへ自動的に進む
  // ここで「次のID」をどう決めるか？
  // 例: 次のID = currentId+1 と仮定する場合
  
  if (!data.choices || data.choices.length === 0) {
    // 強制的に次のIDへ
    const nextId = parseInt(currentId, 10) + 1;
    // 次のIDが存在するかどうかはGASがエラー返すまで読み続けるか、あるいは
    // シナリオ的に最後まで進んだらエラーが返るのでそこで停止する。
    // ここではとりあえず次のIDを読み込み。
    
    // 連続で呼び出すと一気に最後までメッセージを読み込んでしまう可能性があるため
    // 一旦若干のタイマーを置くなどすると自然。
    await new Promise(r => setTimeout(r, 500)); // 0.5秒待つ例
    loadMessage(nextId.toString());
  } else {
    // 選択肢がある場合はユーザー入力待ちとなる
    if (data.choices.length > 0) {
      showChoices(data.currentId, data.choices);
    }
  }
}
