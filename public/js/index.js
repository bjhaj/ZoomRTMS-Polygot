import zoomSdk from '@zoom/appssdk';

(async () => {
    try {
        const configResponse = await zoomSdk.config({
            capabilities: ['startRTMS', 'stopRTMS'],
        });

        console.debug('Zoom JS SDK Configuration', configResponse);

        const { runningContext } = configResponse;
        if (runningContext === 'inMeeting') {
            const rtmsResponse = await zoomSdk.callZoomApi('startRTMS');
            console.debug('RTMS Start Response:', rtmsResponse);
        }
    } catch (e) {
        console.error('Error in Zoom SDK:', e);
    }
})();
