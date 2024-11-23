const cheerio = require('cheerio');
const axios = require('axios');

const { InternalServer } = require('../core/response/errorResponse');
const CRICBUZZ_URL = "https://www.cricbuzz.com";
const fetchScore = async (matchId) => {
    try {
        const response = await axios.get(`${CRICBUZZ_URL}/live-cricket-scores/${matchId}`);
        const $ = cheerio.load(response.data);

        // General match details
        const update = $('.cb-text-stumps').text().trim() || $('.cb-text-lunch, .cb-text-tea').text().trim() || 'Match Stats will Update Soon';
        const liveScore = $('.cb-font-20.text-bold').text().trim() || 'N/A';
        const runRate = $('span.cb-font-12.cb-text-gray span').text().trim() || 'N/A';

        // Batsmen details
        const batsmen = [];
        $('.cb-min-inf').first().find('.cb-min-itm-rw').each((_, elem) => {
            const batsmanName = $(elem).find('a.cb-text-link').text().trim();
            const runs = $(elem).find('.cb-col-10.ab.text-right').eq(0).text().trim();
            const balls = $(elem).find('.cb-col-10.ab.text-right').eq(1).text().trim();
            const fours = $(elem).find('.cb-col-8.ab.text-right').eq(0).text().trim();
            const sixes = $(elem).find('.cb-col-8.ab.text-right').eq(1).text().trim();
            const strikeRate = $(elem).find('.cb-col-14.ab.text-right').text().trim();

            batsmen.push({
                name: batsmanName,
                runs: runs || '0',
                balls: balls || '0',
                fours: fours || '0',
                sixes: sixes || '0',
                strikeRate: strikeRate || '0.00',
            });
        });

        // Bowlers details
        const bowlers = [];
        $('.cb-min-inf').last().find('.cb-min-itm-rw').each((_, elem) => {
            const bowlerName = $(elem).find('a.cb-text-link').text().trim();
            const overs = $(elem).find('.cb-col-10.text-right').eq(0).text().trim();
            const maidens = $(elem).find('.cb-col-8.text-right').eq(0).text().trim();
            const runs = $(elem).find('.cb-col-10.text-right').eq(1).text().trim();
            const wickets = $(elem).find('.cb-col-8.text-right').eq(1).text().trim();
            const economy = $(elem).find('.cb-col-14.text-right').text().trim();

            bowlers.push({
                name: bowlerName,
                overs: overs || '0',
                maidens: maidens || '0',
                runs: runs || '0',
                wickets: wickets || '0',
                economy: economy || '0.00',
            });
        });

        // Return structure
        return {
            title: $('.cb-nav-hdr.cb-font-18.line-ht24').text().trim().replace(', Commentary', ''),
            update: update,
            liveScore: liveScore,
            runRate: runRate,
            batsmen: batsmen,
            bowlers: bowlers,
        };
    } catch (e) {
        console.error('Error fetching score:', e);
        throw new InternalServer("Something went wrong");
    }
};

const fetchMatches = async (endpoint, type) => {
    try {
        // const { data } = await axios.get('https://www.cricbuzz.com/cricket-match/live-scores');
        const { data } = await axios.get(`${CRICBUZZ_URL}/cricket-match/${endpoint}`);

        const $ = cheerio.load(data);

        const matches = [];
        // const activeTab = `${origin}-tab`; // Match the active tab with the requested type (e.g., international-tab)
        const tabTypeMap = {
            all: 'all-tab',
            international: 'international-tab',
            league: 'league-tab',
            domestic: 'domestic-tab',
            women: 'women-tab',
        };

        const activeTab = tabTypeMap[type.toLowerCase()] || 'all-tab';

        // const activeTab = typeMap[type.toLowerCase()] || "all-tab"; // Fallback to 'all' if no type is provided
        // $('.cb-col-100.cb-col.cb-tms-itm').each((index, matchElement) => {
        // $(`.cb-plyr-tbody[ng-show="(active_match_type == '${activeTab}')"] .cb-col-100.cb-col`).each((index, matchElement) => {
        // $(`.cb-col.cb-col-100[ng-show*='${activeTab}'] .cb-col-100.cb-col.cb-tms-itm`).each((_, matchElement) => {
            $(`.cb-col.cb-col-100.cb-plyr-tbody[ng-show*="${activeTab}"] .cb-mtch-lst`).each((_, matchElement) => {

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
            if (type && type.toLowerCase() === 'women') {
                if (!matchTitle.toLowerCase().includes('women')) {
                    return; // Skip matches that are not women's matches
                }
            }
            // Finding the date element
            const dateElement = $(matchElement).find('.text-gray');
            const dateText = dateElement.text().trim();
            // console.log('Date Text:', dateText);

            let dateTime = '';

            if (dateText.includes("Today")) {
                const parts = dateText.split('Today');
                if (parts.length > 0) {
                    // matchType = parts[0].trim(); // e.g., "1st Test"
                    dateTime = "Today"; // Or extract a proper date if available
                }
            }

            // console.log('Match Type:', matchType);
            // console.log('Extracted dateTime:', dateTime);


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

        // console.log('Matches fetched:', matches);
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
