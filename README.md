# 📘 Jeopardy JSON

A lightweight Node.js package that fetches and converts Jeopardy! game data from the [J! Archive](https://j-archive.com) into structured, readable JSON — perfect for trivia apps, data analysis, machine learning models, or educational tools.

## ✨ Features

- 🔎 Fetches full Jeopardy! game data by `game_id`
- 📦 Outputs clean, structured JSON with categories, clues, values, and answers
- 🧠 Supports Jeopardy, Double Jeopardy, and Final Jeopardy rounds
- ⚡ Provides a list of available games with air dates using `update()`

## 📦 Installation

```bash
npm install jeopardy-json
```

## 🚀 Usage

### Get a Game by `game_id`

```js
const jeopardy = require('jeopardy-json');

const gameID = 1;

jeopardy.getGame(gameID)
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('Error fetching game data:', err);
  });
```

### Or Get JSON as a String

```js
jeopardy.getString(gameID).then(str => {
  console.log(str);
});
```

### Get an Up-To-Date List of Shows and Game IDs

```js
jeopardy.update()
  .then(gameList => {
    console.log(gameList);
  });
```

## 📂 Output Format

Each game is returned as a structured object like this:

```json
 {
  title: "Game Title",
  jeopardy_round: {
    "Category 1": [
      { clue: "Clue text", response: "Correct answer", value: "Value of the clue", dd: true/false, row: 0, columm: 0 },
      ...
    ],
    "Category 2": [ ... ],
    ...
  },
  double_jeopardy_round: {
    "Category 1": [
      { clue: "Clue text", response: "Correct answer", value: "Value of the clue", dd: true/false, row: 0, columm: 0 },
     ],
    ...
  },
  final_jeopardy_round: {
    "Category Name": { clue: "Final clue text", response: "Final correct answer" }
  },
  current_game: 1234,
  next_game: 1235
}
```

> Clues are grouped by category. Each clue object includes the question (`clue`), correct answer (`response`), dollar value (`value`), and whether it was a Daily Double (`dd`).

## 📝 License

This project is licensed under the [MIT License](LICENSE).
