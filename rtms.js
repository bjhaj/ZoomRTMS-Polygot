import express from 'express';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Get Zoom credentials from environment variables
const ZOOM_SECRET_TOKEN = process.env.ZOOM_SECRET_TOKEN;
const CLIENT_ID = process.env.ZM_CLIENT_ID;
const CLIENT_SECRET = process.env.ZM_CLIENT_SECRET;

// Debug log the environment variables
console.log('Environment Variables:');
console.log('CLIENT_ID:', CLIENT_ID);
console.log('CLIENT_SECRET:', CLIENT_SECRET);

// Keep track of active connections
const activeConnections = new Map();
// Keep track of UI clients
const uiClients = new Set();

// Handle POST requests to the root path of the router
router.post('/', (req, res) => {
    console.log('RTMS Webhook received:', JSON.stringify(req.body, null, 2));
    const { event, payload } = req.body;

    if (event === 'endpoint.url_validation' && payload?.plainToken) {
        const hash = crypto
            .createHmac('sha256', ZOOM_SECRET_TOKEN)
            .update(payload.plainToken)
            .digest('hex');
        console.log('Responding to URL validation challenge');
        return res.json({
            plainToken: payload.plainToken,
            encryptedToken: hash,
        });
    }

    if (event === 'meeting.rtms_started') {
        console.log('RTMS Started event received');
        const { meeting_uuid, rtms_stream_id, server_urls } = payload;
        connectToSignalingWebSocket(meeting_uuid, rtms_stream_id, server_urls);
    }

    if (event === 'meeting.rtms_stopped') {
        console.log('RTMS Stopped event received');
        const { meeting_uuid } = payload;
        if (activeConnections.has(meeting_uuid)) {
            const connections = activeConnections.get(meeting_uuid);
            for (const conn of Object.values(connections)) {
                if (conn && typeof conn.close === 'function') {
                    conn.close();
                }
            }
            activeConnections.delete(meeting_uuid);
        }
    }

    res.sendStatus(200);
});

// Function to broadcast message to all UI clients
function broadcastToUIClients(message) {
    uiClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function generateSignature(CLIENT_ID, meetingUuid, streamId, CLIENT_SECRET) {
    console.log('Generating signature with parameters:');
    //console.log('clientId:', clientId);
    console.log('meetingUuid:', meetingUuid);
    console.log('streamId:', streamId);
   // console.log('secret:', secret);

    const message = `${CLIENT_ID},${meetingUuid},${streamId}`;
    return crypto.createHmac('sha256', CLIENT_SECRET).update(message).digest('hex');
}

function connectToSignalingWebSocket(meetingUuid, streamId, serverUrl) {
    console.log(`Connecting to signaling WebSocket for meeting ${meetingUuid}`);

    const ws = new WebSocket(serverUrl);

    // Store connection for cleanup later
    if (!activeConnections.has(meetingUuid)) {
        activeConnections.set(meetingUuid, {});
    }
    activeConnections.get(meetingUuid).signaling = ws;

    ws.on('open', () => {
        console.log(
            `Signaling WebSocket connection opened for meeting ${meetingUuid}`
        );
        const signature = generateSignature(
            CLIENT_ID,
            meetingUuid,
            streamId,
            CLIENT_SECRET
        );

       
        const handshake = {
            msg_type: 1,
            protocol_version: 1,
            meeting_uuid: meetingUuid,
            rtms_stream_id: streamId,
            sequence: Math.floor(Math.random() * 1e9),
            signature,
        };
        ws.send(JSON.stringify(handshake));
        console.log('Sent handshake to signaling server');
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log('Signaling Message:', JSON.stringify(msg, null, 2));

        if (msg.msg_type === 2 && msg.status_code === 0) {
            const mediaUrl = msg.media_server?.server_urls?.all;
            if (mediaUrl) {
                connectToMediaWebSocket(mediaUrl, meetingUuid, streamId, ws);
            }
        }

        // Handle keep-alive requests immediately to maintain connection
        if (msg.msg_type === 12) {
            const keepAliveResponse = {
                msg_type: 13,
                timestamp: msg.timestamp,
            };
            console.log('Responding to Signaling KEEP_ALIVE_REQ immediately');
            ws.send(JSON.stringify(keepAliveResponse));
        }
    });

    ws.on('error', (err) => {
        console.error('Signaling socket error:', err);
        // Try to reconnect after a brief delay
        setTimeout(() => {
            if (activeConnections.has(meetingUuid)) {
                console.log('Attempting to reconnect signaling WebSocket...');
                connectToSignalingWebSocket(meetingUuid, streamId, serverUrl);
            }
        }, 5000);
    });

    ws.on('close', () => {
        console.log('Signaling socket closed');
        if (activeConnections.has(meetingUuid)) {
            delete activeConnections.get(meetingUuid).signaling;
            
            // Try to reconnect after a brief delay
            setTimeout(() => {
                if (activeConnections.has(meetingUuid)) {
                    console.log('Attempting to reconnect signaling WebSocket after close...');
                    connectToSignalingWebSocket(meetingUuid, streamId, serverUrl);
                }
            }, 5000);
        }
    });
}

function connectToMediaWebSocket(
    mediaUrl,
    meetingUuid,
    streamId,
    signalingSocket
) {
    console.log(`Connecting to media WebSocket at ${mediaUrl}`);

    const mediaWs = new WebSocket(mediaUrl, { rejectUnauthorized: false });

    // Store connection for cleanup later
    if (activeConnections.has(meetingUuid)) {
        activeConnections.get(meetingUuid).media = mediaWs;
    }

    mediaWs.on('open', () => {
        const signature = generateSignature(
            CLIENT_ID,
            meetingUuid,
            streamId,
            CLIENT_SECRET
        );
        const handshake = {
            msg_type: 3,
            protocol_version: 1,
            meeting_uuid: meetingUuid,
            rtms_stream_id: streamId,
            signature,
            media_type: 8,  // 8 is for all transcriptions
            payload_encryption: false,
            // Request all participants' audio by setting the all_participants flag
            all_participants: true
        };
        console.log('Sending media handshake with all_participants=true:', handshake);
        mediaWs.send(JSON.stringify(handshake));
    });

    mediaWs.on('message', (data) => {
        try {
            // Try to parse as JSON first
            const msg = JSON.parse(data.toString());
            
            // For debugging, log all message types except keep-alive (too verbose)
            if (msg.msg_type !== 12 && msg.msg_type !== 13) {
                console.log('Media JSON Message:', JSON.stringify(msg, null, 2));
            }

            // Check if this is a speech content message (msg_type 17) from any participant
            if (msg.msg_type === 17) {
                console.log('Speech content message detected!');
                
                // Determine the message format and extract data
                let speechData = null;
                let participantId = 'unknown';
                let participantName = 'Unknown Speaker';
                
                if (msg.content) {
                    // Standard format with content field
                    speechData = msg.content;
                    participantId = speechData.user_id || 'unknown';
                    participantName = speechData.user_name || 'Unknown Speaker';
                    console.log(`Speech from participant ${participantName} (${participantId}): "${speechData.data}"`);
                } else if (msg.user_id && msg.user_name) {
                    // Direct message format
                    speechData = {
                        user_id: msg.user_id,
                        user_name: msg.user_name,
                        data: msg.data || msg.text || '',
                        timestamp: msg.timestamp || Date.now() * 1000
                    };
                    participantId = msg.user_id;
                    participantName = msg.user_name;
                    console.log(`Direct speech from participant ${participantName} (${participantId}): "${speechData.data}"`);
                } else {
                    // Unknown format, use the full message
                    speechData = msg;
                    console.log('Using unknown message format for speech data');
                }
                
                if (speechData) {
                    console.log('Broadcasting speech data to UI clients:', speechData);
                    broadcastToUIClients({
                        type: 'speech',
                        data: speechData
                    });
                }
            }

            // Handle handshake success
            if (msg.msg_type === 4 && msg.status_code === 0) {
                signalingSocket.send(
                    JSON.stringify({
                        msg_type: 7,
                        rtms_stream_id: streamId,
                    })
                );
                console.log(
                    'Media handshake successful, sent start streaming request'
                );
            }

            // Handle keep-alive requests immediately to maintain connection
            if (msg.msg_type === 12) {
                const keepAliveResponse = {
                    msg_type: 13,
                    timestamp: msg.timestamp,
                };
                mediaWs.send(JSON.stringify(keepAliveResponse));
                console.log('Responded to Media KEEP_ALIVE_REQ immediately');
            }
        } catch (err) {
            // If JSON parsing fails, it's binary audio data
            console.log('Raw audio data received (base64 sample):', data.toString('base64').substring(0, 100) + '...');
        }
    });

    mediaWs.on('error', (err) => {
        console.error('Media socket error:', err);
        // Try to reconnect after a brief delay
        setTimeout(() => {
            if (activeConnections.has(meetingUuid)) {
                console.log('Attempting to reconnect media WebSocket...');
                connectToMediaWebSocket(mediaUrl, meetingUuid, streamId, signalingSocket);
            }
        }, 5000);
    });

    mediaWs.on('close', () => {
        console.log('Media socket closed');
        if (activeConnections.has(meetingUuid)) {
            delete activeConnections.get(meetingUuid).media;
            
            // Try to reconnect after a brief delay
            setTimeout(() => {
                if (activeConnections.has(meetingUuid)) {
                    console.log('Attempting to reconnect media WebSocket after close...');
                    connectToMediaWebSocket(mediaUrl, meetingUuid, streamId, signalingSocket);
                }
            }, 5000);
        }
    });
}

// This function can be called from app.js to initialize the RTMS routes
export function initRtmsRoutes(app) {
    // The router is mounted at /webhook, so webhook requests will go to /webhook
    app.use('/webhook', router);
    console.log('RTMS webhook endpoint registered at /webhook');
}

// Create WebSocket server for UI clients
export function setupWSServer(server) {
    const wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws) => {
        console.log('UI client connected');
        uiClients.add(ws);
        
        ws.on('close', () => {
            console.log('UI client disconnected');
            uiClients.delete(ws);
        });
    });
    
    console.log('WebSocket server for UI clients initialized');
    return wss;
}

export default {
    initRtmsRoutes,
    setupWSServer
};
