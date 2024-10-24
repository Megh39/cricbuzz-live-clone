const cheerio = require('cheerio');
const axios = require('axios');

const { InternalServer } = require('../core/response/errorResponse');
const CRICBUZZ_URL = "https://www.cricbuzz.com";
const fetchScore = async (matchId) => {
    try {
        const response = await axios.get(`${CRICBUZZ_URL}/live-cricket-scores/${matchId}`);
        const $ = cheerio.load(response.data);

        // General match details
        const update = $('.cb-col.cb-col-100.cb-min-stts.cb-text-complete').text().trim() || 'Match Stats will Update Soon';
        const liveScore = $('.cb-font-20.text-bold').text().trim() || 'N/A';

        // Run rate extraction (fixed to select the second span)
        const runRate = $('span.cb-font-12.cb-text-gray').find('span').last().text().trim() || 'N/A';

        // Batsmen details (fixed selector)
        const batsmen = [];
        $('div[ng-if="match.miniscore.batsman.length > 0"] .cb-min-itm-rw.ng-scope').each((i, elem) => {
            const batsmanName = $(elem).find('a.cb-text-link').text().trim();
            const runs = $(elem).find('div[ng-bind="batsmen.batRuns"]').text().trim();
            const balls = $(elem).find('div[ng-bind="batsmen.batBalls"]').text().trim();
            const fours = $(elem).find('div[ng-bind="batsmen.batFours"]').text().trim();
            const sixes = $(elem).find('div[ng-bind="batsmen.batSixes"]').text().trim();
            const strikeRate = $(elem).find('div[ng-bind="batsmen.batStrikeRate|number: 2"]').text().trim();

            batsmen.push({
                name: batsmanName,
                runs: runs || '0',
                balls: balls || '0',
                fours: fours || '0',
                sixes: sixes || '0',
                strikeRate: strikeRate || '0.00',
            });
        });


        const bowlers = [];
        $('.cb-col.cb-col-100.cb-min-itm-rw').each((i, elem) => {
            const bowlerName = $(elem).find('.cb-col.cb-col-50 a').text().trim();
            const overs = $(elem).find('.cb-col.cb-col-10.text-right').eq(0).text().trim();
            const maidens = $(elem).find('.cb-col.cb-col-8.text-right').eq(0).text().trim();
            const runs = $(elem).find('.cb-col.cb-col-10.text-right').eq(1).text().trim();
            const wickets = $(elem).find('.cb-col.cb-col-8.text-right').eq(1).text().trim();
            const economy = $(elem).find('.cb-col.cb-col-14.text-right').text().trim();
        
            if (bowlerName) {
                bowlers.push({
                    name: bowlerName,
                    overs: overs || '0',
                    maidens: maidens || '0',
                    runs: runs || '0',
                    wickets: wickets || '0',
                    economy: economy || '0.00',
                });
            } else {
                console.error('Bowler not found at index:', i); // Log the index if bowler is not found
            }
        });
        // Return structure with all data
        return {
            title: $('.cb-nav-hdr.cb-font-18.line-ht24').text().trim().replace(', Commentary', ''),
            update: update,
            liveScore: liveScore,
            runRate: runRate,
            batsmen: batsmen, // Array of batsman objects
            bowlers: bowlers, // Array of bowler objects
        };
    } catch (e) {
        console.error('Error fetching score:', e); // More detailed error logging
        throw new InternalServer("Something went wrong");
    }
};


const fetchMatches = async () => {
    try {
        const { data } = await axios.get('https://www.cricbuzz.com/cricket-match/live-scores');
        const $ = cheerio.load(data);

        const matches = [];

        $('.cb-col-100.cb-col.cb-tms-itm').each((index, matchElement) => {
            const titleElement = $(matchElement).find('.cb-lv-scr-mtch-hdr a');
            const matchTitle = titleElement.text().trim();
            // const matchLink = titleElement.attr('href');
            const matchType = $(matchElement).find('.text-gray').first().text().trim();
            const matchLink = $(matchElement).find('.cb-lv-scr-mtch-hdr a');
            
            const href = matchLink.attr('href');
            const matchIdMatch = href.match(/\/live-cricket-scores\/(\d+)\//);
            const matchId = matchIdMatch ? matchIdMatch[1] : null;
            const team1 = $(matchElement).find('.cb-hmscg-bwl-txt .cb-hmscg-tm-nm').first().text().trim();
            const score1 = $(matchElement).find('.cb-hmscg-bwl-txt div[style*="inline-block"]').first().text().trim();
            const team2 = $(matchElement).find('.cb-hmscg-bat-txt .cb-hmscg-tm-nm').first().text().trim();
            const score2 = $(matchElement).find('.cb-hmscg-bat-txt div[style*="inline-block"]').first().text().trim();

            const status = $(matchElement).find('.cb-text-live, .cb-text-complete, .cb-text-abandon').text().trim() || 'Not Available';
            // Finding the date element
            const dateElement = $(matchElement).find('.text-gray');
            const dateText = dateElement.text().trim();
            console.log('Date Text:', dateText);

            let dateTime = '';

            if (dateText.includes("Today")) {
                const parts = dateText.split('Today');
                if (parts.length > 0) {
                    // matchType = parts[0].trim(); // e.g., "1st Test"
                    dateTime = "Today"; // Or extract a proper date if available
                }
            }

            // console.log('Match Type:', matchType);
            console.log('Extracted dateTime:', dateTime);


            // Get the venue text directly and extract the venue name
            // Get the venue text directly
            const venueText = dateElement.find('.text-gray').text().trim(); // Get the venue text directly

            // Use a regular expression to match the last occurrence of " at " and get the text after it
            const venueMatch = venueText.match(/at\s+(.*)/); // Capture everything after "at "

            const venue = venueMatch && venueMatch[1] ? venueMatch[1].trim() : ''; // Get the captured group or default to an empty string


            // Constructing the final dateTime string
            // const dateTime = `${startDate} - ${endDate} ${time}`;

            if (matchTitle && team1 && team2) {
                matches.push({
                    matchId,
                    matchTitle,
                    matchType,
                    // matchLink: `https://www.cricbuzz.com${matchLink}`,
                    team1: `${team1} ${score1}`,
                    team2: `${team2} ${score2}`,
                    result: $(matchElement).find('.cb-text-complete').text().trim(),
                    status,
                    dateTime,
                    venue // Now only contains the venue name
                });
            }
        });

        console.log('Matches fetched:', matches);
        return matches;
    } catch (error) {
        console.error('Error fetching matches:', error);
        throw new InternalServer("Something went wrong");
    }
};

module.exports = {
    fetchScore,
    fetchMatches
};
