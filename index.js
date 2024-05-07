const { google } = require("googleapis");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs
const PORT = process.env.PORT || 3001;
const {
    createCalendar,
    shareCalendar,
    makeCalendarPublic,
    addEvents,
    getMillVilleCalendar,
} = require("./api");

// Store request statuses in memory
const statusStore = {};

// Utility to update the status of a particular request
const updateStatus = (requestId, status, message, links = {}) => {
    statusStore[requestId] = {
        status,
        message,
        ...links,
    };
};

const app = express();
const corsOptions = {
    origin: "https://jackrubiralta.github.io",
    optionsSuccessStatus: 200,
};

app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Endpoint to initiate calendar processing
app.post("/processEvents", (req, res) => {
    // Generate a unique request ID for tracking this process
    const requestId = uuidv4();
    updateStatus(requestId, "processing", "Event processing started.");

    // Asynchronous processing starts
    (async () => {
        try {
            const {
                shareEmail,
                defaultColor,
                blockToClasses,
                blockToColors,
                humanitiesBlock,
                secondLunchBlocks,
            } = req.body;

            const events = await getMillVilleCalendar(34);

            events.sort(
                (a, b) =>
                    new Date(a.start.dateTime) - new Date(b.start.dateTime)
            );

            let processedEvents = [];
            let lastEvent = null;

            for (let event of events) {
                let blockLetter = event.summary[0];

                if (event.summary === humanitiesBlock) {
                    if (lastEvent && lastEvent.summary === "FLEX") {
                        lastEvent.colorId = blockToColors[event.summary];
                        lastEvent.end = event.end;
                        lastEvent.summary = blockToClasses[humanitiesBlock];
                        continue;
                    } else {
                        event.colorId = blockToColors[event.summary];
                        event.summary = blockToClasses[humanitiesBlock];
                    }
                } else if (event.summary.includes("FLEX")) {
                    if (
                        lastEvent &&
                        lastEvent.summary === blockToClasses[humanitiesBlock]
                    ) {
                        lastEvent.end = event.end;
                        continue;
                    } else {
                        event.colorId = blockToColors["FLEX"];
                        event.summary = "Flex";
                    }
                } else if (blockToClasses[event.summary]) {
                    event.colorId = blockToColors[event.summary];
                    event.summary = blockToClasses[event.summary];
                } else if (event.summary.length === 2) {
                    let blockNumber = event.summary[1];
                    if (secondLunchBlocks.includes(blockLetter)) {
                        if (blockNumber === "1") {
                            event.colorId = blockToColors[blockLetter];
                            event.summary = blockToClasses[blockLetter];
                        } else if (blockNumber === "2") {
                            event.colorId = blockToColors["Lunch"];
                            event.summary = "Lunch";
                        }
                    } else {
                        if (blockNumber === "1") {
                            event.colorId = blockToColors["Lunch"];
                            event.summary = "Lunch";
                        } else if (blockNumber === "2") {
                            event.colorId = blockToColors[blockLetter];
                            event.summary = blockToClasses[blockLetter];
                        }
                    }
                } else if (event.summary.includes("Chapel")) {
                    event.colorId = blockToColors["Chapel"];
                    event.summary = event.summary.replace(",", "");
                } else if (event.summary.includes("House Meetings")) {
                    event.colorId = blockToColors["House Meetings"];
                    event.summary = event.summary.replace(",", "");
                } else {
                    event.colorId = defaultColor;
                }

                lastEvent = event;
                let start = new Date(event.start.dateTime);
                let end = new Date(event.end.dateTime);
                let duration = (end - start) / (1000 * 60 * 60 * 24); // Convert duration from milliseconds to days

                // Only push the event if its duration is less than one day
                if (duration < 1) {
                    processedEvents.push(event);
                }
            }

            const calendarDetails = await createCalendar(
                "Millville School Adjusted Events"
            );

            if (calendarDetails) {
                console.log(`New Calendar Created: ${calendarDetails.id}`);
                await addEvents(processedEvents, calendarDetails.id);
                const shareResult = await shareCalendar(
                    calendarDetails.id,
                    shareEmail
                );
                const iCalLink = await makeCalendarPublic(calendarDetails.id);
                const googleCalendarLink = `https://calendar.google.com/calendar/u/0?cid=${calendarDetails.id}`;

                updateStatus(
                    requestId,
                    "completed",
                    "Events processed and calendar created.",
                    {
                        iCalLink,
                        googleCalendarLink,
                    }
                );
            } else {
                updateStatus(
                    requestId,
                    "failed",
                    "Failed to create a new calendar."
                );
            }
        } catch (error) {
            console.error(`Error in processEvents: ${error}`);
            updateStatus(requestId, "failed", "Internal server error.");
        }
    })();

    // Immediately return the request ID for the client to poll
    res.json({ requestId });
});

// Endpoint to check the status of processing
app.get("/status/:requestId", (req, res) => {
    const { requestId } = req.params;
    const statusInfo = statusStore[requestId] || {
        status: "unknown",
        message: "Invalid Request ID.",
    };
    res.json(statusInfo);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
