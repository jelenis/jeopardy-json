# Jeopardy JSON

A simple tool that converts Jeopardy! game data from the J! Archive into structured and readable JSON format, ideal for trivia apps, data analysis, or educational projects.

## Features

- Fetches and parses Jeopardy! game data from the J! Archive.
- Outputs clean JSON with categories, clues, values, and answers.
- Ideal for trivia apps, data analysis, or educational projects.
- Lightweight and easy to integrate into Node.js workflows.

## Installation

```bash
npm install jeopardy-json
```

## Usage

```javascript
const jeopardy = require('jeopardy-json');
const gameID = 1; // gameID's are mostly random 

jeopardy.getGame(gameID)
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('Error fetching game data:', err);
  });
  // or simply use the getString() promise
  jeopardy.getString(gameID).then(str => {
    console.log(str);
  });

```

This will output a JSON object containing the game's categories, clues, values, and answers.

```javascript
const jeopardy = require('jeopardy-json');
  jeopardy.update()
  .then(gameList => {
    console.log(gameList)
  });

```
You can get an up-to-date list of shows and their corresponding gameIDs by calling update

## Output Format

```json
{
  "rounds": {
    "Jeopardy!": [
      {
        "category": "History",
        "clues": [
          {
            "value": "$200",
            "question": "He was the first president of the United States.",
            "answer": "George Washington"
          }
        ]
      }
    ],
    "Double Jeopardy!": [],
    "Final Jeopardy!": {
      "category": "World Capitals",
      "clue": "This city has been the capital of its country since 1867.",
      "answer": "Ottawa"
    }
  }
}
```

## License

This project is licensed under the [MIT License](LICENSE).
