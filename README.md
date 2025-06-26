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

## 📂 Output Format

Each game is returned as a structured object like this:

```jsonc
{
  "title": "Show #4605 - Friday, September 17, 2004",
  "jeopardy_round": {
    "ASIAN HISTORY": [
      {
        "clue": "In a 2003 annual cost-of-living survey, it was ranked as the world's most expensive city",
        "response": "Tokyo",
        "value": "$200",
        "dd": false,
        "image": "",
        "video": "",
        "row": 0,
        "column": 0
      },
     // ...
    ],
    "WE LOVE BROADWAY": [
      {
        "clue": "Introduced in a 1933 film, this song has become a toe-tapping favorite on Broadway",
        "response": "\"42nd Street\"",
        "value": "$200",
        "dd": false,
        "image": "",
        "video": "",
        "row": 0,
        "column": 1
      }
    ]
    // Additional categories...
  },
  "double_jeopardy_round": {
    "MONTY PYTHON": [
      {
        "clue": "The BBC TV show theme is actually 'Liberty Bell' by this American marching bandmaster",
        "response": "Sousa",
        "value": "$400",
        "dd": false,
        "image": "",
        "video": "",
        "row": 0,
        "column": 0
      }
    ]
    // Additional categories...
  },
  "final_jeopardy_round": {
    "MARILYN MONROE MOVIES": {
      "clue": "Marilyn plots her husband's murder at a honeymoon site in this, her only film with a 1-word title",
      "response": "Niagara",
      "image": "",
      "video": ""
    }
  },
  "current_game": 10,
  "next_game": 11
}
```
> Clues are grouped by category. Each clue object includes the question (`clue`), correct answer (`response`), dollar value (`value`), and whether it was a Daily Double (`dd`).


### Get an Up-To-Date List of Shows and Game IDs

```js
jeopardy.update()
  .then(gameList => {
    console.log(gameList);
  });
```



### Get the most up to date array of Games sorted by show number

```js
jeopardy.getGamesList()
  .then(games => {
    console.log(games);
  });
```
### Get a single show from the currently stored games list (1-based index)

```js
jeopardy.getShow(gameID)
  .then(show => {
    console.log(show);
  });
```

### GetGamesList and GetShow Ouput 
this is index 122 in the games list
```js
  [...{
    game_id: 7847,
    show_number: 123,
    air_date: '1985-02-27',
    season: 1
  }...]
```

## 📝 License

This project is licensed under the [MIT License](LICENSE).
