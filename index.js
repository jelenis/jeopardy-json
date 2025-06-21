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
 * gameData = {
 *   title: "Game Title",
 *   jeopardy_round: {
 *     "Category 1": [
 *       { clue: "Clue text", response: "Correct answer", value: "Value of the clue", dd: true/false, row: 0 },
 *       ...
 *     ],
 *     ...
 *   },
 *   double_jeopardy_round: {
 *     "Category 1": [ ... ],
 *     ...
 *   },
 *   final_jeopardy_round: {
 *     "Category Name": { clue: "Final clue text", response: "Final correct answer" }
 *   },
 *   current_game: 1234,
 *   next_game: 1235ver
 * }
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

    // the values for each row in the jeopardy and double jeopardy rounds
    // these are hardcoded because they are the same for every game
    const rowValues = {
        "jeopardy_round": ['$200', '$400', '$600', '$800', '$1000'],
        "double_jeopardy_round": ['$400', '$800', '$1200', '$1600', '$2000']
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
        const categories = [];
        let $rows = $("#" + round + " table.round > tbody").children();

        $rows.each((row, v) => {
            let $row = $(v);

            // add the categories to the game object
            $row.find("td.category_name").each((_, v) => {
                let $data = $(v);
                let category = $data.text();

                categories.push(category);
            });

            // we found all the categories, now we can parse the clues
            // and answers for this round
            $row.find("td.clue").each((column, v) => {
                let $data = $(v);
                let clue =  "";
                let response = $data.find("em.correct_response").text() || "";
                let val = $data.find("td.clue_value").text();
                let dd = false; // daily double
                const cat = categories[column];


                let clueProps = parseClue($data.find("td.clue_text").html());
                

                const jeodparyClue = {
                    clue: clueProps.text,
                    response: null,
                    value: val,
                    dd: dd,
                    image: clueProps.image,
                    video: clueProps.video,
                    column: column,
                    row: row - 1 // row is 1-indexed in the HTML, so we need to subtract 1
                }

                // if there is a clue but no value, then it is a daily double
                if (val == "" && clue != "") {
                    dd = true;
                }
                // hardcode the rowValues for the clues
                jeodparyClue.value = rowValues[round][row - 1];
              

                // if clue contains onmouseover, then it has a correct answer
                // in the onmouseover attribute
                let attr = $data.find("div").attr("onmouseover");
                if (attr) {
                    // if the clue has a correct answer, then we need to parse it
                    response = $data.find("em.correct_response").text() || ""
                    jeodparyClue.response = response;
                }

                // initialize the clue list for this round and category
                // if it doesn't already exist
                if (!game[round][cat]) {
                    game[round][cat] = [];
                }
                game[round][cat].push(jeodparyClue);

            });
        });
    }

    // the final jeopardy round is a bit different
    // so we need to parse it separately
    const $fj = $("#final_jeopardy_round");
    const attr = $fj.find(".category > div").attr("onmouseover");
    const cat = $fj.find(".category_name").text() || "";

    if (attr && $fj) {
        clueProps = parseClue($fj.find("td.clue_text").html())
        game.final_jeopardy_round[cat] = {
            clue: clueProps.text,
            response: $fj.find("em.correct_response").text() || "",
            image: clueProps.image,
            video: clueProps.video
        }
    }
    return game;
}


function parseClue(encodedText) {
    const clueProps = {
        text: "",
        image: "",
        video: ""
    }
    // helper function to leftover htmlentities
    const decodeHtmlEntity = function(str) {
        return str.replace(/&#(\d+);/g, function(match, dec) {
            return String.fromCharCode(dec);
        });
    };
    let decodedText = decodeHtmlEntity(encodedText);

    // there is html embedded in the text (probably a video or image)
    let startOfHidden = decodedText.indexOf("(<a");
    if (startOfHidden != -1) {
        
        const videoMatch = decodedText.match(/href="([^"]+\.mp4)"/);
        if (videoMatch) {
            clueProps.video = videoMatch[1];
        }
        const imgMatch = decodedText.match(/href="([^"]+\.jpg)"/);
        if (imgMatch) {
            clueProps.img = imgMatch[1];
        }

        let endOfHidden = decodedText.indexOf(">)");
        if (endOfHidden != -1) {
            decodedText = decodedText.slice(endOfHidden+2);
        }
    }
    $chr = cheerio.load(decodedText);
    decodedText = $chr.text();
    clueProps.text = decodedText;
    return clueProps;
}

/*
 * Get the game from the j-archive
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
 *     "Category 1": [ ... ],
 *     ...
 *   },
 *   final_jeopardy_round: {
 *     "Category Name": { clue: "Final clue text", response: "Final correct answer" }
 *   },
 *   current_game: 1234,
 *   next_game: 1235
 * }
 */
function getGame(game_id = 1) {
    let game_url = 'http://www.j-archive.com/showgame.php?game_id=' + game_id;

    // make a erquest to the j-archive game page
    // and parse the html, then check for .wmv files
    // TODO: handle the .wmv files
    return axios.get(game_url)
        .then(resp => parseGame(resp.data, game_id))
        .then(game => {

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
