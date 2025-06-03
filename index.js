const http = require('http'); // Loads the http module
const axios = require('axios'); // for making HTTP requests, promises based
const cheerio = require('cheerio'); // implments a subset of jQuery for easy HTML parsing
const scraper = require('./scraper'); // for scraping the j-archive


/**
 * Parses the HTML of a Jeopardy! game page and extracts game data into a structured object.
 *
 * @param {string} html - The HTML content of the Jeopardy! game page.
 * @param {number} [game_id=1] - The ID of the current game being parsed.
 * @returns {Object} An object representing the parsed game, including title, rounds, categories, clues, responses, and game navigation.
 *
 * @example
 * const html = '<html>...</html>';
 * const gameData = parseGame(html, 1234);
 *
 * // gameData = {
 * //   title: "Game Title",
 * //   jeopardy_round: {
 * //     "Category 1": [
 * //       { clue: "Clue text", response: "Correct answer", value: "Value of the clue", dd: true/false, row: 0 },
 * //       ...
 * //     ],
 * //     ...
 * //   },
 * //   double_jeopardy_round: {
 * //     "Category 1": [ ... ],
 * //     ...
 * //   },
 * //   final_jeopardy_round: {
 * //     "Category Name": { clue: "Final clue text", response: "Final correct answer" }
 * //   },
 * //   current_game: 1234,
 * //   next_game: 1235
 * // }
 */
function parseGame(html, game_id = 1) {
    $ = cheerio.load(html);
    let game = {
        "title": "",
        "jeopardy_round": {
        },
        "double_jeopardy_round": {
        },
        "final_jeopardy_round": {},
        "current_game": game_id,
        "next_game": null
    };
     
    game.title = $("#game_title h1").text();

    // get the next game id from the title
    next_game = $("#contestants_table td a:contains([next game >>])").attr("href");
    if (next_game) {
        game.next_game = Number(next_game.slice("showgame.php?game_id=".length));
    }

    // loop through the jeopardy clues and parse them
    // also record the values of each row
    for (round of ["jeopardy_round", "double_jeopardy_round"]) {
        const rowValues = [];
        const categories = [];
        let $rows = $("#" + round + " table.round > tbody").children();
       

        $rows.each((_, v) => {
            let $row = $(v);

            // add the categories to the game object
            $row.find("td.category_name").each((_, v) => {
                let $data = $(v);
                let category = $data.text();

                categories.push(category);
            });

            // we found all the categories, now we can parse the clues
            // and answers for this round
            let rowval = null;
            $row.find("td.clue").each((i, v) => {
                let $data = $(v);
                let clue = $data.find("td.clue_text").html() || "";
                let response = $data.find("em.correct_response").text() || "";
                let val = $data.find("td.clue_value").text();
                let dd = false; // daily double
                const cat = categories[i];

                if (val == "" && clue != "") {
                    // get dd value
                    // val = $data.find("td.clue_value_daily_double").text().slice(3);
                    val = "";
                    dd = true;
                } else if (val) {
                    rowval = val;
                }


                // push the answer to the game object
                if (!game[round][cat]) {
                    game[round][cat] = [];
                }

                // if clue contains onmouseover, then it has a correct answer
                // in the onmouseover attribute
                let attr = $data.find("div").attr("onmouseover");
                if (!attr) {
                    // there is no correct answer push the clue
                    game[round][cat].push({
                        clue: clue,
                        response: null,
                        value: val,
                        dd: dd
                    });
                    return;
                }


                response = $data.find("em.correct_response").text() || ""

                if (dd) {
                    // console.log(val);
                }
                // console.log(game[round].categories[cat], cat);


                game[round][cat].push({
                    clue: clue,
                    response: response,
                    value: val,
                    dd: dd,
                    row: i
                });



            });
            if (rowval){
                rowValues.push(rowval);
            }
        });

        // replace daily double values with the row value
        // this is because the daily double value is the same for all clues
         for (let cat in game[round]) {
            for (let v of game[round][cat]) {
                if (v.dd) {
                  v.value = rowValues[v.row];
                }
            }
         }
   
    }

   
          // replace daily double values if the question exists since its not listed
        // this is because the daily double value is the same for all clues
        // in the same row, so we need to set it to the row value




    // the final jeopardy round is a bit different
    // so we need to parse it separately
    const $fj = $("#final_jeopardy_round");
    const attr = $fj.find(".category > div").attr("onmouseover");
    const cat = $fj.find(".category_name").text() || "";
    if (attr && $fj) {
        game.final_jeopardy_round[cat] = {
            clue: $fj.find("td.clue_text").html() || "",
            response: $fj.find("em.correct_response").text() || "",
        }
    }

    return game;

}

/* * Get the game from the j-archive
 * @param {Number} game_id - The game id to get (dictated by the archive)
 * @returns {Promise} - A promise that resolves to the game object
 * in the format:
 * {
 *   title: "Game Title",
 *   jeopardy_round: {
 *     "Category 1": [
 *       { clue: "Clue text", response: "Correct answer", value: "Value of the clue", dd: true/false, row: 0 },
 *       ...
 *     ],
 *     ...
 *   },
 *   double_jeopardy_round: {
 *     ... (same structure as jeopardy_round)
 *   },
 *   final_jeopardy_round: {
 *     "Category Name": { clue: "Final clue text", response: "Final correct answer" }
 *   },
 *   current_game: "current game id",
 *   next_game: "next game id"
 * }
 */
function getGame(game_id = 1) {
    let game_url = 'http://www.j-archive.com/showgame.php?game_id=' + game_id;

    // make a erquest to the j-archive game page
    // and parse the html, then check for .wmv files
    // TODO: handle the wmv
    return axios.get(game_url)
        .then(resp => parseGame(resp.data, game_id))
        .then(game => {

            // loop through the jeopardy round answers
            // and convert the video clues to mp4
            // for (let r of game.jeopardy_round.clue) {

            //     if (r.clue && r.clue.indexOf(".wmv") >= 0) {
            //         ans.clue = "found video clue";
            //     }
            // }

            return game;
        });
}


/**
 * Get the game from the j-archive and return it as a string
 * @param {Number} game_id 
 * @returns a promise that resolves to a stringified version of the game object
 */
function getString(game_id) {
    return new Promise((resolve, reject) => {
        getGame(game_id)
            .then(game => {
                resolve(JSON.stringify(game));
            })
            .catch(err => {
                reject(err);
            });
    });
}

module.exports = {
    getGame,
    getString,
    ...scraper
};
