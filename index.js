const { google } = require('googleapis');
const express = require('express');
const morgan = require("morgan");
const cors = require('cors');
const PORT = process.env.PORT || 3001;
const {
    createCalendar,
    shareCalendar,
    addEvent,
    deleteEvent,
    getCalendarEvents,
    getMillVilleCalendar,
    deleteAllCalendars,
    makeCalendarPublic,
    addEvents
} = require('./api');
 
const app = express();
const corsOptions = {
    origin: 'https://jackrubiralta.github.io', // Replace this with your front-end app's URL
    optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors());

app.use(express.json()); // for parsing application/json
app.use(morgan("combined"));
// Configuration and Google calendar API initialization

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
            let start = new Date(event.start.dateTime);
            let end = new Date(event.end.dateTime);
            let duration = (end - start) / (1000 * 60 * 60 * 24); // Convert duration from milliseconds to days
        
            if (duration < 1) {
                // Only push the event if its duration is less than one day
                processedEvents.push(event);
            }
        
        }

        // Create a new calendar and add these events to it

        const calendarDetails = await createCalendar("Millville School Adjusted Events");
        if (calendarDetails) {
            console.log(`New Calendar Created: ${calendarDetails.id}`);
            
            
            
            

           
        
            
            
           
            const results = await addEvents(processedEvents, calendarDetails.id);

            const shareResult = await shareCalendar(calendarDetails.id, shareEmail);

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