// sim, atoa mesmo
function bombGame() {
    const EMOJI = "bomb";
    const BOMB = `||:${EMOJI}:||`;
    const BLANK = "||⠀⠀||"; // obs: alinhamento manual do tamanho do quadrado, veja no dc.
    const CANVAS_SIZE = 10;
    const BOMB_COUNT = 2;
    const HEADER = `||:boom:${BOMB_COUNT}|| `
  
    let canvasArray = Array(CANVAS_SIZE).fill(BLANK);
    for (let i = 0; i < BOMB_COUNT; i++) {
      canvasArray[i] = BOMB;
    }
  
    // Embaralhando
    for (let i = canvasArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [canvasArray[i], canvasArray[j]] = [canvasArray[j], canvasArray[i]];
    }
  
    const canvasString = canvasArray.join('');  
    return HEADER + canvasString;
}

module.exports = {
bombGame
}