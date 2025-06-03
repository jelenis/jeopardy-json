
const http = require('http'); // Loads the http module
const axios = require('axios'); // for making HTTP requests, promises based
const cheerio = require('cheerio'); // implments a subset of jQuery for easy HTML parsing

// get game
function parseGame(html, game_id=1) {
    $ = cheerio.load(html);
    let game = {
        "title": "",
        "jeopardy_round": {
            categories: [],
            ans: []
        },
        "double_jeopardy_round": {
            categories: [],
            ans: []
        },
        "final_jeopardy_round": {},
        "current_game": game_id,
        "next_game": ""
    };

    game.title = $("#game_title h1").text();

    // get the next game id from the title
    next_game = $("#contestants_table td a:contains([next game >>])").attr("href");
    if (next_game) {
        game.next_game = next_game.slice("showgame.php?game_id=".length);
    }

    // loop through the jeopardy clues and parse them
    for (round in game) {
        let $rows = $("#" + round + " table.round > tbody").children();

        $rows.each((_, v) => {
            let $row = $(v);

            // add the categories to the game object
            $row.find("td.category_name").each((_, v) => {
                let $data = $(v);
                let category = $data.text();

                game[round].categories.push(category);
            });

            let rowval = 0;
            $row.find("td.clue").each((_, v) => {
                let $data = $(v);
                let clue = $data.find("td.clue_text").html() || "";
                let val = $data.find("td.clue_value").text();
                let dd = false;

                if (val == "" && clue != "") {
                    // get dd value
                    // val = $data.find("td.clue_value_daily_double").text().slice(3);
                    val = "";
                    dd = true;
                } else if (val) {
                    rowval = val;
                }

                // if clue contains onmouseover, then it has a correct answer
                // in the onmouseover attribute
                let attr = $data.find("div").attr("onmouseover");
                if (!attr) {
                    return;
                }


                let correct = $data.find("em.correct_response").text() || ""

                // push the answer to the game object
                game[round].ans.push({
                    clue: clue,
                    correct: correct,
                    val: val,
                    dd: dd
                });

            });

            // replace daily double values
            for (v of game[round].ans.slice(-6)) {
                if (v.dd) {
                    v.val = rowval;
                }
            }
        });
    }

    // the final jeopardy round is a bit different
    // so we need to parse it separately
    let $fj = $("#final_jeopardy_round");
    let attr = $fj.find(".category > div").attr("onmouseover");

    if (attr && $fj) {
        game.final_jeopardy_round = {
            category: $fj.find(".category_name").text(),
            clue: $fj.find("td.clue_text").html() || "",
            correct: $fj.find("em.correct_response").text() || "",
        }
    }
    
    return game;

}

/* * Get the game from the j-archive
 * @param {Number} game_id - The game id to get (dictated by the archive)
 * @returns {Promise} - A promise that resolves to the game object
 * in the format:
 * {    
 *  "title": "Game Title",
 *   "jeopardy_round": {
 *    categories: ["Category 1", "Category 2", ...],
 *  ans: [
 *    {
 *     clue: "Clue text",
 *     correct: "Correct answer",
 *     val: "Value of the clue",
 *     dd: true/false (if it's a daily double)
 *   }
 *  ]
 * },
 *  
 * "double_jeopardy_round": {   
 *   ... (same structure as jeopardy_round)
 * },   
 * "final_jeopardy_round": {
 *  category: "Category name",
 *  clue: "Final clue text",
 *  correct: "Final correct answer"
 * },
 * "current_game": "current game id",
 * "next_game": "next game id"
 *  
 */
function getGame(game_id=1) {
    let game_url = 'http://www.j-archive.com/showgame.php?game_id=' + game_id;

    // make a erquest to the j-archive game page
    // and parse the html, then check for .wmv files
    // TODO: handle the wmv
    return axios.get(game_url)
        .then(resp => parseGame(resp.data, game_id))
        .then(game => {

            // loop through the jeopardy round answers
            // and convert the video clues to mp4
            for (let r of game.jeopardy_round.ans) {

                if (r.clue && r.clue.indexOf(".wmv") >= 0) {
                    ans.clue = "found video clue";
                }
            }

            return game;
        });
}


/**
 * Get the game from the j-archive and return it as a string
 * @param {Number} game_id 
 * @returns a promise that resolves to a stringified version of the game object
 */
function getString(game_id)    {
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
};
