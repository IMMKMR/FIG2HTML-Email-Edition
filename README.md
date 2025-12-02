# FIG2HTML - Email Edition

**FIG2HTML** is a powerful Figma plugin designed to convert your Figma designs into production-ready HTML code, with a special focus on **Email Compatibility**. It simplifies the process of creating responsive, table-based layouts that render correctly across major email clients (including Outlook).

## 🚀 Features

- **Email-Ready Output**: Generates table-based HTML layouts optimized for email clients when "Email Compatibility" is enabled.
- **Smart Layer Tagging**: Control how specific elements are rendered using special naming conventions.
- **Asset Management**: Automatically exports images and supports GIF uploads.
- **Link Handling**: Add clickable links directly from Figma layer names.
- **Credits System**: Built-in system to manage export usage (includes promo code redemption).

## 🏷️ Special Layer Tags

Use these tags in your Figma layer names to trigger specific behaviors:

| Tag | Description | Usage Example |
| :--- | :--- | :--- |
| `[table]` | Renders the group/frame as an HTML `<table>`. Essential for complex layouts. | `[table] Header Section` |
| `[gif]` | Creates a placeholder for a GIF. You will be prompted to upload the `.gif` file in the plugin UI. | `[gif] hero-animation` |
| `[link]` | Makes the layer clickable. Append the URL after the tag. | `[link] https://example.com` |
| `[transparent]` | Exports the layer as a PNG with a transparent background, ignoring temporary fills. | `[transparent] Logo` |

## 🛠️ Installation & Setup

1.  **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Build the Plugin**:
    ```bash
    npm run build
    ```
    *Or run in watch mode for development:*
    ```bash
    npm run watch
    ```
4.  **Load in Figma**:
    -   Open Figma and go to **Plugins > Development > Import plugin from manifest...**
    -   Select the `manifest.json` file located in this project directory.

## 📖 Usage Guide

1.  **Select a Frame**: Click on the top-level Frame you wish to export.
2.  **Open Plugin**: Run **FIG2HTML** from your plugins menu.
3.  **Configure Settings**:
    -   **Email Compatibility**: Toggle this ON if you are creating an email newsletter.
4.  **Manage Assets**:
    -   If you used `[gif]` tags, upload the corresponding GIF files in the UI.
    -   Review any detected links.
5.  **Export**: Click **Export Selection**.
    -   The plugin will generate a ZIP file containing the `index.html` and an `images` folder.

## 💳 Credits & Promo Codes

The plugin operates on a credit system:
-   **New Users**: Start with **5 free credits**.
-   **Cost**: 1 credit per export (specifically per table generated).
-   **Redeem**: Enter promo codes in the UI to top up your balance.
-   **Admin**: Includes an admin panel for generating codes (requires admin secret).

## 💻 Development

-   **`code.ts`**: Contains the main plugin logic (Figma API interaction, node traversal).
-   **`ui.html`**: Handles the user interface, HTML post-processing (email compatibility logic), and ZIP generation.

---
*Built with TypeScript & Figma Plugin API.*
