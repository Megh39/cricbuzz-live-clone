
const asyncHandler = require("express-async-handler");
const route = require('../routes/v1');
const HttpResponse = require('../core/response/httpResponse');
const { fetchScore, fetchMatches,fetchUpcomingMatches } = require("../services/fetchMatchData");

/**
 * match id is a number
 */

route.get(
    '/score/:matchId',
    asyncHandler(async function getMatches(req, res) {

        try {
            const { matchId } = req.params;

            const score = await fetchScore(matchId)

            const httpResponse = HttpResponse.get({ message: "Matches data successfull retrived", data: score });
            res.status(200).json(httpResponse);
        } catch (error) {
            console.error(error)
            console.error("Error in route handler:", error);

        }
    })
);


/**
 * 4 types of matches
 * international, league, domestic, women
 * if type not given, default match type is 'international'
 */

function createMatchesRoute(path, endpoint) {
    try {
        route.get(
            path,
            asyncHandler(async function getMatches(req, res) {
                try {
                    const type = req.query.type || 'international'; // Default to 'international'
                    let matches;

                    if (path === '/matches/upcoming') {
                        // Use the fetchUpcomingMatches function for upcoming matches
                        matches = await fetchUpcomingMatches(endpoint, type);
                    } else {
                        // Use the regular fetchMatches function for other types
                        matches = await fetchMatches(endpoint, type);
                    }

                    const httpResponse = HttpResponse.get({ message: "Matches data successfully retrieved", data: matches });
                    res.status(200).json(httpResponse);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ message: "Error retrieving matches" });
                }
            })
        );
    } catch (error) {
        console.error(error);
    }
}

createMatchesRoute('/matches/live', 'live-scores');
createMatchesRoute('/matches/recent', 'live-scores/recent-matches');
createMatchesRoute('/matches/upcoming', 'live-scores/upcoming-matches');


module.exports = route;
