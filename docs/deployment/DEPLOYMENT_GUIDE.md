# Deployment and Testing Guide

This guide provides actionable steps for testing the application locally and deploying it to Netlify.

## Prerequisites

*   **Node.js**: Version 18 or higher.
*   **Netlify CLI**: Install globally via `npm install -g netlify-cli`.
*   **Git**: For version control.

## Local Development

To run the application locally:

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory (or use Netlify Dev to inject them) with the following keys:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    OPENROUTER_API_KEY=your_openrouter_api_key
    ```
    *Note: When using Netlify Dev, it is recommended to set these in the Netlify UI or via `netlify env:set`.*

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    This will start the Vite dev server. However, since the app uses Netlify Functions, it is **highly recommended** to use the Netlify CLI:

    ```bash
    netlify dev
    ```
    This command spins up a local server that mimics the Netlify environment, including Function execution.

## Netlify Deployment

### Configuration

The project is configured via `netlify.toml`. Key settings include:
*   **Build Command**: `npm run build`
*   **Publish Directory**: `dist`
*   **Functions Directory**: `netlify/functions`

### Steps to Deploy

1.  **Connect to Netlify**:
    Link your repository to a new site in the Netlify dashboard.

2.  **Configure Environment Variables**:
    In the Netlify Site Settings > Build & Deploy > Environment, add the following variables:
    *   `GEMINI_API_KEY`: Your Google Gemini API key.
    *   `OPENROUTER_API_KEY`: Your OpenRouter API key.

3.  **Trigger Deploy**:
    Push to your main branch or trigger a manual deploy from the Netlify dashboard.

### Actionable Next Steps

1.  **Verify Functions**: Check the Netlify "Functions" tab to ensure all functions (`gemini-chat`, `openrouter-chat`, etc.) are deployed successfully.
2.  **Live Testing**: Visit the deployed URL.
    *   Upload a sample text file.
    *   Click "Generate Dataset".
    *   Monitor the Network tab in DevTools to ensure calls to `/.netlify/functions/gemini-chat` and `/.netlify/functions/openrouter-chat` are succeeding (200 OK).
3.  **Monitor Usage**: Keep an eye on your API usage quotas for Gemini and OpenRouter.
