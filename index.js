const { google } = require('googleapis');
const express = require('express');
const morgan = require("morgan");
const cors = require('cors');
const PORT = process.env.PORT || 3001;

const app = express();
const corsOptions = {
    origin: 'https://jackrubiralta.github.io', // Replace this with your front-end app's URL
    optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

app.use(express.json()); // for parsing application/json
app.use(morgan("combined"));
// Configuration and Google calendar API initialization
const CREDENTIALS = { "type": "service_account", "project_id": "millville-calendar", "private_key_id": "4b6dd4ed86d202e289e4255662b1d54e5fed0aba", "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQC6AzBn9npw/3Rc\ncoK9fzAqrCSRaswLsElwQEAG4IOLa8W5AddBbBsXZF17dM/gk0+X/ZK06cy4VGXs\nF3kJB6IK3K333HLmE5gnmn5Vm+sWrBIgHL5c06cYL/nrqWbT/y2xGbfnL9rOYX0B\nMzxegZpXu0T6uR4SmLXkOzyIY1BA1j4bR/GQmuv3vuGRKEpIXCrzwaV8JCcqr9Gw\nx6pZVRCX55pXkK3nbFqaW+oNKlo2Z7XcAzEvi53ir9oBCCihev1gCjQ1oqq7ASkg\nWSeSsy9tPR5FXElue/nxEtmlUgAL5qBeOcxUyNxPW0pqPziuc55f2znwLzQOzode\nMuM3dyWPAgMBAAECgf8FQuylmlTaYPUZELrEyAWMawocFjcw+qWkVdgNkYVgsoH8\nWpLiBkEMGerWUwJ+h5oOUf6dvxtcG2ZgnbliQa+Xnw+1jFucwku0PWFLam9e6qvi\n8kZWbWGI4aHleU+8wAys5cQoAUGJA/n8JN+AxqJPPRRn/WXf8Cjse6VIvqonWva6\nyTVOr7JNLnoNEB5fhrWnoILePBHlvii/DaYFOUZGm0g8FCZpnjYgfEQLzf4a+txt\nauRZT9pkbB/LsJvGATCWexdHQPfhR73DFEBfnSQHG3dpsvhGqCcrPwhO8llFTU2g\nfm/K2RpNnPZjfm+TyQL/QuPOLw1V2J4qrta4nKUCgYEA+Orsk+Hf8v46sCkeeBf/\nV3QOn85PlhYiFBtPOqvq9NxP3w5H1sNgn/9YVyko/nTCfQxLXSmMwncPQK35SQKd\nWqaAV2ZNfxn/gfS3L0/RMO6kgHN0rnKNjkmy1j04uHAIGV+gwL49miHU7/TiI+cK\n7RKJkWpJEH/mVxmm2jrK2gMCgYEAv04S1vnKeNRq80xEV0uALylGQNcsYG7RdYRp\nltfzanzw7fZx2Vu2d2tvON2hQMi03AA7VS//jRlnkBHFoUEZhzITGMZOU/agxNle\nieK4T7MnMHqDzFGlpdsYo3apd8ByP3Gbs2t+aKT8yALOf5T3PVOZh6759PY2HS46\nEu2H9oUCgYBGEGI9EfQmgpbkZP6VkTOnWxyOsNTICzzWagV4H1IIUEcPIwbnlaEK\nCCbGiehnD1h7OE2yUHK1fivF6fJkMZ83F+zCLSKdJyU7YDV71LyuSE33dgge3lGn\n/mifUyY3DBnLgpZOCn5udx1n2YcZ0fvKVVBxpPgh885TL/4+KRRWHwKBgGv2qdc9\nHbFXYAxyzFbfuzXie014ogjCQd+qnNSOh0dfv7DsVpAunCmFLj3PhoPDQZ6vWszW\ny8hbwACkpv48eSW9ct2WfPoRw+WULzBuDUqdds57NgqHQY76uUr3WujEaTW47gAx\n+CMiia5vNw71iRrJJWpXq6U9loidYBTyjLrpAoGBAKu72uj2I8SeAscLVxLo2XQK\nrjYgBSnK34Q8sDGccxIMpbBLgsiVEO5oFMJ6Lfyr8M0fFVETRBmghboJbXWmEgEB\nZnSX5WdnRcjlhA8Tk8LK1LfoAbc3miEEU6vIoKG7Pp/Bb2TfFR+jqiopniPE91Wp\nTBvwcXmikQJ8INQFVnQw\n-----END PRIVATE KEY-----\n", "client_email": "millville@millville-calendar.iam.gserviceaccount.com", "client_id": "109669552773336549351", "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token", "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs", "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/millville%40millville-calendar.iam.gserviceaccount.com", "universe_domain": "googleapis.com" };
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);
const calendar = google.calendar({ version: "v3" });

// Function to create a new calendar with a specific title
const createCalendar = async (title) => {
    try {
        const response = await calendar.calendars.insert({
            auth,
            requestBody: { summary: title }
        });
        return response.data;
    } catch (error) {
        console.error(`Error at createCalendar --> ${error}`);
        return null;
    }
};

// Function to share a calendar with a specified email
const shareCalendar = async (calendarId, email) => {
    try {
        const response = await calendar.acl.insert({
            auth,
            calendarId,
            requestBody: {
                role: 'owner',
                scope: {
                    type: 'user',
                    value: email
                }
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error at shareCalendar --> ${error}`);
        return null;
    }
};

// Function to insert a new event into a specific calendar
const addEvent = async (event, calendarId) => {
    try {
        const response = await calendar.events.insert({
            auth,
            calendarId,
            resource: event
        });
        return response.status === 200 ? 1 : 0;
    } catch (error) {
        console.log(`Error at addEvent --> ${error}`);
        return 0;
    }
};

// Function to delete an event from a calendar
const deleteEvent = async (calendarId, eventId) => {
    try {
        const response = await calendar.events.delete({
            auth,
            calendarId,
            eventId
        });
        return response.data === '' ? 1 : 0;
    } catch (error) {
        console.error(`Error at deleteEvent --> ${error}`);
        return 0;
    }
};

// Function to get all events from a calendar between two dates
const getCalendarEvents = async (calendarId, startTime, endTime) => {
    try {
        const response = await calendar.events.list({
            auth,
            calendarId,
            timeMin: startTime,
            timeMax: endTime,
            timeZone: 'Asia/Kolkata'
        });
        return response.data.items;
    } catch (error) {
        console.error(`Error at getCalendarEvents --> ${error}`);
        return [];
    }
};




async function getMillVilleCalendar(date_range) {
  // Get date for the end of the week (Most recent Sunday)
    const dateFrom = new Date();
    const dateTo = new Date(dateFrom);
    dateTo.setDate(dateFrom.getDate() + date_range);
  
  
    const apiKey = "AIzaSyBxoBIAkPxbC1hZNtFOmpHFv_z2ya9I838";
    const formatDate = (date) =>
        `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    // Get the calendar events for the week from school's Google Calendar API
    const url = `https://www.googleapis.com/calendar/v3/calendars/spsacademiccal%40gmail.com/events?key=${apiKey}&timeMin=${formatDate(
        dateFrom
    )}T00%3A00%3A00-05%3A00&timeMax=${formatDate(
        dateTo
    )}T00%3A00%3A00-05%3A00&singleEvents=true&maxResults=9999`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    return data.items.map(event => ({
        summary: event.summary.trim(),  // Trim spaces from the summary
        start: { dateTime: event.start.dateTime || event.start.date, timeZone: event.start.timeZone },
        end: { dateTime: event.end.dateTime || event.end.date, timeZone: event.end.timeZone },
    }));
}

const deleteAllCalendars = async () => {
    try {
        // First, list all calendars
        const listResponse = await calendar.calendarList.list({
            auth
        });
        const calendars = listResponse.data.items;

        // Iterate over each calendar and delete it
        for (const cal of calendars) {
            // Skip primary calendar as it cannot be deleted
            if (cal.id === 'primary') {
                console.log("Skipping primary calendar.");
                continue;
            }

            const deleteResponse = await calendar.calendars.delete({
                auth,
                calendarId: cal.id
            });
            if (deleteResponse.status === 204) {
                console.log(`Deleted calendar: ${cal.summary} (ID: ${cal.id})`);
            } else {
                console.log(`Failed to delete calendar: ${cal.summary} (ID: ${cal.id})`);
            }
        }
    } catch (error) {
        console.error(`Error in deleteAllCalendars --> ${error}`);
    }
};

/**
 * Makes a specified Google Calendar public and returns the iCal public URL.
 * @param {string} calendarId The ID of the calendar to make public.
 * @returns {string} The iCal URL of the public calendar.
 */
async function makeCalendarPublic(calendarId) {
    try {
        // Update the calendar to make it public
        await calendar.acl.insert({
            auth,
            calendarId,
            requestBody: {
                role: 'reader',
                scope: {
                    type: 'default'
                }
            }
        });

        // Construct the iCal link using the public calendar ID
        const iCalLink = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
        console.log(`Calendar made public: ${iCalLink}`);
        return iCalLink;
    } catch (error) {
        console.error('Failed to make calendar public:', error);
        throw error;
    }
}

const addEvents = async (events, calendarId) => {
    const promises = events.map(event => {
        return calendar.events.insert({
            auth,
            calendarId,
            resource: event
        }).then(response => ({
            status: 'success',
            summary: event.summary
        })).catch(error => ({
            status: 'failed',
            summary: event.summary,
            error: error.message
        }));
    });
    return Promise.all(promises);
};




// Your routes go here


const humFlex = "FLEX";

// Endpoint to configure and process calendar events
app.post('/processEvents', async (req, res) => {
    try {
        // Retrieve setup data from request body
        
        const {
            shareEmail: shareEmail,
            defaultColor: defaultColor,
            blockToClasses: blockToClasses,
            blockToColors: blockToColors,
            humanitiesBlock: humanitiesBlock,
            secondLunchBlocks: secondLunchBlocks
        } = req.body;
        // Assign received data to global variables
        

        // Retrieve events from MillVille calendar
        const events = await getMillVilleCalendar(34);

        // Sort events by start time to handle them in chronological order
        events.sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

        let processedEvents = [];
        let lastEvent = null; // This will hold the last humanities or flex event for comparison

        // Process each event according to the setup provided
        for (let event of events) {
            let blockLetter = event.summary[0]; // Assuming the first character is the block letter

            if (event.summary === humanitiesBlock) {
                // Check if this event is a humanities block or a flex event
                if (lastEvent && lastEvent.summary === humFlex) {
                    lastEvent.colorId = blockToColors[event.summary];
                    lastEvent.end = event.end; // Extend the end time of the last event
                    lastEvent.summary = blockToClasses[humanitiesBlock]; // Ensure the summary reflects the humanities block
                    continue; // Skip adding the current event as a separate entry
                } else {
                    event.colorId = blockToColors[event.summary];
                    event.summary = blockToClasses[humanitiesBlock];
                }
            } else if (event.summary.includes(humFlex)) {
                if (lastEvent && lastEvent.summary === blockToClasses[humanitiesBlock]) {
                    lastEvent.end = event.end; // Extend the end time of the last event
                    continue; // Skip adding the current event as a separate entry
                } else {
                    event.colorId = blockToColors[humFlex];
                    event.summary = "Flex";
                }
            } else if (blockToClasses[event.summary]) {
                event.colorId = blockToColors[event.summary];
                event.summary = blockToClasses[event.summary];
            } else if (event.summary.length == 2) {
                let blockNumber = event.summary[1]; // Assuming the second character is the block number
                if (secondLunchBlocks.includes(blockLetter)) {
                    if (blockNumber === "1") {
                        // Class time for this block
                        event.colorId = blockToColors[blockLetter];
                        event.summary = blockToClasses[blockLetter];
                    } else if (blockNumber === "2") {
                        // Lunch time for this block
                        event.colorId = blockToColors["Lunch"];
                        event.summary = "Lunch";
                    }
                } else {
                    if (blockNumber === "1") {
                        // Lunch time for this block
                        event.colorId = blockToColors["Lunch"];
                        event.summary = "Lunch";
                    } else if (blockNumber === "2") {
                        // Class time for this block
                        event.colorId = blockToColors[blockLetter];
                        event.summary = blockToClasses[blockLetter];
                    }
                } 
            } else if (event.summary.includes("Chapel")) {
                event.colorId = blockToColors["Chapel"];
            } else if (event.summary.includes("House Meetings")) {
                event.colorId = blockToColors["House Meetings"];
            }
            
            else {
                event.summary = event.summary;
                event.colorId = defaultColor;
            }

            lastEvent = event; // Update last event to the current event
            processedEvents.push(event);
        }

        // Create a new calendar and add these events to it

        const calendarDetails = await createCalendar("Millville School Adjusted Events");
        if (calendarDetails) {
            console.log(`New Calendar Created: ${calendarDetails.id}`);
            
            
            
            
            const shareResult = await shareCalendar(calendarDetails.id, shareEmail);

           
        
            
            
           
            const results = await addEvents(events, calendarDetails.id);
            const iCalLink = await makeCalendarPublic(calendarDetails.id);
            const googleCalendarLink = `https://calendar.google.com/calendar/u/0?cid=${calendarDetails.id}`;  // Make sure the timezone is correct

            console.log(`Calendar created and shared. iCal Link: ${iCalLink}, Google Calendar Link: ${googleCalendarLink}`);

            res.json({
                status: 'success',
                message: 'Events processing and calendar created.',
                iCalLink,
                googleCalendarLink
            });
            

            
           
            
         

            
        } else {
            console.log("Failed to create a new calendar");
            res.status(500).json({ status: 'error', message: 'Internal server error.' });
        }

       // res.json({ status: 'success', message: 'Events processed and calendar created.' });
        // also just have it the google link to the calendar
    } catch (error) {
        console.error(`Error in processEvents endpoint: ${error}`);
        res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });