const express = require('express');
const {
    createCalendar,
    addEvent,
    shareCalendar,
    getMillVilleCalendar
} = require("./api");
const cors = require("cors");

const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(cors());

app.use(express.json());

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
            } else if (event.summary === humFlex) {
                if (lastEvent && lastEvent.summary === blockToClasses[humanitiesBlock]) {
                    lastEvent.end = event.end; // Extend the end time of the last event
                    continue; // Skip adding the current event as a separate entry
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
            } else if (event.summary.includes(humFlex)) {
                event.colorId = blockToColors[humFlex];
                event.summary = "Flex";
            } else {
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
            for (const event of processedEvents) {
                const result = await addEvent(event, calendarDetails.id);
                console.log(
                    result
                        ? `Event added successfully: ${event.summary}`
                        : `Failed to add event: ${event.summary}`
                );
            }

            await shareCalendar(calendarDetails.id, shareEmail);

            // Assuming makeCalendarPublic is implemented and works as expected
            const iCalLink = await makeCalendarPublic(calendarDetails.id);
            const googleCalendarLink = `https://calendar.google.com/calendar/embed?src=${calendarDetails.id}&ctz=America/New_York`;  // Make sure the timezone is correct

            console.log(`Calendar created and shared. iCal Link: ${iCalLink}, Google Calendar Link: ${googleCalendarLink}`);
            res.json({
                status: 'success',
                message: 'Events processed and calendar created.',
                iCalLink,
                googleCalendarLink
            });
        } else {
            console.log("Failed to create a new calendar");
        }

        res.json({ status: 'success', message: 'Events processed and calendar created.' });
        // have it share the secret iCal address https://calendar.google.com/calendar/ical/b2ea17f785fc848d8b6b8a3de042982e334f7c0665cb582217969575bb883137%40group.calendar.google.com/private-54231690c6a7e78d33608a86c0e0e9f4/basic.ics
        // also just have it the google link to the calendar
    } catch (error) {
        console.error(`Error in processEvents endpoint: ${error}`);
        res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
