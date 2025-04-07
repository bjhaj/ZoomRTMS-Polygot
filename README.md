# Real-Time Subtitling Zoom App

This Zoom App uses Node.js + Express to build a real-time subtitling application powered by Zoom's Real-Time Media Streaming (RTMS) capabilities. The app captures audio from Zoom meetings, transcribes it, and displays subtitles in real-time.

## Prerequisites

1. [Node JS](https://nodejs.org/en/)
2. [Ngrok](https://ngrok.com/docs/getting-started)
3. [Zoom Account](https://support.zoom.us/hc/en-us/articles/207278726-Plan-Types-)
4. [Zoom App Credentials](#config:-app-credentials) (Instructions below)
    1. Client ID
    2. Client Secret
    3. Redirect URI
5. [Zoom Beta Client](#install-the-zoom-beta-client)

## Getting started

Open your terminal:

```bash
# Clone down this repository
git clone git@github.com:zoom/zoomapps-sample-js.git

# navigate into the cloned project directory
cd zoomapps-sample-js

# run NPM to install the app dependencies
npm install

# initialize your ngrok session
ngrok http 3000
```

### Create your Zoom App

In your web browser, navigate to [Zoom Developer Portal](https://developers.zoom.us/) and register/log into your
developer account.

Click the "Build App" button at the top and choose to "Zoom Apps" application.

1. Name your app
2. Choose whether to list your app on the marketplace or not
3. Click "Create"

For more information, you can follow [this guide](https://dev.to/zoom/introducing-zoom-apps-33he)
check out [this video series](https://www.youtube.com/playlist?list=PLKpRxBfeD1kGN-0QgQ6XtSwtxI3GQM16R) on how to create and configure these sample Zoom Apps.

### Config: App Credentials

In your terminal where you launched `ngrok`, find the `Forwarding` value and copy/paste that into the "Home URL" and "
Redirect URL for OAuth" fields.

```
Home URL:               https://xxxxx.ngrok.io
Redirect URL for OAuth: https://xxxxx.ngrok.io/auth
```

> NOTE: ngrok URLs under ngrok's Free plan are ephemeral, meaning they will only live for up to a couple hours at most, and will change every time you reinitialize the application. This will require you to update these fields every time you restart your ngrok service.

#### OAuth allow list

- `https://example.ngrok.io`

#### Domain allow list

- `appssdk.zoom.us`
- `ngrok.io`

### Config: Information

The following information is required to activate your application:

- Basic Information
    - App name
    - Short description
    - Long description (entering a short message here is fine for now)
- Developer Contact Information
    - Name
    - Email address

> NOTE: if you intend to publish your application on the Zoom Apps Marketplace, more information will be required in this section before submitting.

### Config: App Features

Under the Zoom App SDK section, click the `+ Add APIs` button and enable the following options from their respective
sections:

#### APIs

- shareApp
- startRTMS
- stopRTMS

### Scopes

Ensure that the following scopes are selected on the Scopes tab:
- `zoomapp:inmeeting`
- `meeting:read:rtms`
- `rtms:read:meeting`

### Config `.env`

When building for Development, open the `.env` file in your text editor and enter the following information from the App Credentials section you just
configured:

```ini
# Client ID for your Zoom App
ZM_CLIENT_ID=[app_client_id]

# Client Secret for your Zoom app
ZM_CLIENT_SECRET=[app_client_secret]

# Redirect URI set for your app in the Zoom Marketplace
ZM_REDIRECT_URL=https://[xxxx-xx-xx-xxx-x].ngrok.io/auth

# App Name used for isolating logs
APP_NAME=[your_app_name]

# RTMS Secret Token
ZOOM_SECRET_TOKEN=[your_rtms_secret_token]
```

#### Zoom for Government

If you are a [Zoom for Government (ZfG)](https://www.zoomgov.com/) customer you can use the `ZM_HOST` variable to change
the base URL used for Zoom. This will allow you to adjust to the different Marketplace and API Base URLs used by ZfG
customers.

**Marketplace URL:** marketplace.*zoomgov.com*

**API Base URL:** api.*zoomgov.com*

## Install the Zoom Beta Client

1. Delete the existing Zoom App from your Mac
2. Download the arm.pkg
3. Try to install it, very likely it won't install for the first time
4. In that case, navigate to Privacy & Security, scroll down to security and click on "Open Anyway"
5. You will receive another message from Apple, click "Open Anyway" again
6. Complete the setup
7. Login with your credentials

## Start the App

### Development

Run the `dev` npm script to start in development mode using a Docker container.

```shell
npm run dev
```

The `dev` script will:

1. Watch JS files and built to the dist/ folder
1. Watch Server files and build to the dist/ folder
1. Start the application

### Production

When running your application in production no logs are sent to the console by default and the server is not restarted
on file changes.

We use the `NODE_ENV` environment variable here to tell the application to start in prodcution mode.

```shell
# Mac/Linux
NODE_ENV=production npm start

# Windows
set NODE_ENV=production && npm start
```

## Usage

To install the Zoom App, Navigate to the **Home URL** that you set in your browser and click the link to install.

After you authorize the app, Zoom will automatically open the app within the client.

### RTMS Implementation

The app implements Real-Time Media Streaming (RTMS) with the following features:

1. Webhook endpoint at `/webhook` that handles:
   - URL validation
   - RTMS start/stop events
   - Signaling and media WebSocket connections

2. WebSocket connections for:
   - Signaling handshake
   - Media data streaming
   - Keep-alive messages

3. Audio data processing:
   - Receives raw audio data
   - Processes audio for real-time transcription
   - Generates subtitles for meeting participants

To test the subtitling feature:
1. Start a Zoom meeting
2. Click the Apps option in the Zoom meeting
3. Click on your installed Zoom App
4. The app will automatically start RTMS and begin displaying subtitles

To stop RTMS and subtitling:
1. Click the "Stop RTMS" button in the app, or
2. End the meeting

### Keeping secrets secret

This application makes use of your Zoom App Client ID and Client Secret as well as a custom secret for signing session
cookies. During development, the application will read from the .env file. ;

In order to align with security best practices, this application does not read from the .env file in production mode.

This means you'll want to set environment variables on the hosting platform that you'
re using instead of within the .env file. This might include using a secret manager or a CI/CD pipeline.

> :warning: **Never commit your .env file to version control:** The file likely contains Zoom App Credentials and Session Secrets

### Code Style

This project uses [prettier](https://prettier.io/) and [eslint](https://eslint.org/) to enforce style and protect
against coding errors along with a pre-commit git hook(s) via [husky](https://typicode.github.io/husky/#/) to ensure
files pass checks prior to commit.

### Testing

At this time there are no e2e or unit tests.

## Need help?

If you're looking for help, try [Developer Support](https://devsupport.zoom.us) or
our [Developer Forum](https://devforum.zoom.us). Priority support is also available
with [Premier Developer Support](https://zoom.us/docs/en-us/developer-support-plans.html) plans.

### Documentation
Make sure to review [our documentation](https://marketplace.zoom.us/docs/zoom-apps/introduction/) as a reference when building your Zoom Apps.

## Future Development

Our roadmap includes several enhancements to the current subtitling functionality:

### Speech-to-Speech Translation

We are implementing a complete speech-to-speech translation pipeline that will:
1. Capture audio via RTMS
2. Transcribe the speech in the original language
3. Translate the text to target languages
4. Convert translated text back to speech using Text-to-Speech models
5. Deliver the translated audio to meeting participants

### Voice Preservation Technology

A key focus area is maintaining speaker voice characteristics during translation:
- Researching voice cloning techniques to preserve speaker identity
- Implementing voice style transfer to maintain natural conversation flow
- Developing low-latency processing to ensure seamless communication

These advancements will enable natural multilingual conversations in Zoom meetings while preserving each participant's unique voice characteristics.