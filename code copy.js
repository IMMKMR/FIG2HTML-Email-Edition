"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 500, height: 1200, themeColors: true });
const ADMIN_SECRET = 'S3cr3tAdm1'; // Change this to your desired admin secret
// --- Helper Functions ---
function layoutAnalyzer(nodes, rowTolerance = 10) {
    const visibleNodes = nodes
        .filter(node => node.visible && node.absoluteBoundingBox)
        .sort((a, b) => a.absoluteBoundingBox.y - b.absoluteBoundingBox.y);
    if (visibleNodes.length === 0)
        return [];
    let rows = [];
    if (visibleNodes.length > 0) {
        let currentRow = { nodes: [visibleNodes[0]], y: visibleNodes[0].absoluteBoundingBox.y, height: visibleNodes[0].absoluteBoundingBox.height };
        rows.push(currentRow);
        for (let i = 1; i < visibleNodes.length; i++) {
            const node = visibleNodes[i];
            const nodeBbox = node.absoluteBoundingBox;
            const currentRowYEnd = currentRow.y + currentRow.height;
            if (nodeBbox.y < currentRowYEnd + rowTolerance) {
                currentRow.nodes.push(node);
                currentRow.height = Math.max(currentRow.height, (nodeBbox.y - currentRow.y) + nodeBbox.height);
            }
            else {
                currentRow = { nodes: [node], y: nodeBbox.y, height: nodeBbox.height };
                rows.push(currentRow);
            }
        }
    }
    for (const row of rows) {
        row.nodes.sort((a, b) => a.absoluteBoundingBox.x - b.absoluteBoundingBox.x);
    }
    return rows;
}
// --- Credits System ---
function initializeCredits() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stored = yield figma.clientStorage.getAsync('tableCredits');
            const initialCredits = typeof stored === 'number' ? stored : 5;
            yield figma.clientStorage.setAsync('tableCredits', initialCredits);
            figma.ui.postMessage({ type: 'credits', balance: initialCredits });
        }
        catch (error) {
            console.error('Failed to initialize credits:', error);
            yield figma.clientStorage.setAsync('tableCredits', 5);
            figma.ui.postMessage({ type: 'credits', balance: 5 });
        }
    });
}
function initializePromoCodes() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let storedAvailable = yield figma.clientStorage.getAsync('promoAvailable');
            if (typeof storedAvailable !== 'object' || storedAvailable === null) {
                storedAvailable = {};
                yield figma.clientStorage.setAsync('promoAvailable', storedAvailable);
            }
            let storedUsed = yield figma.clientStorage.getAsync('promoUsed');
            if (!Array.isArray(storedUsed)) {
                storedUsed = [];
                yield figma.clientStorage.setAsync('promoUsed', storedUsed);
            }
            const storedAdminMode = yield figma.clientStorage.getAsync('isAdminMode');
            if (typeof storedAdminMode !== 'boolean') {
                yield figma.clientStorage.setAsync('isAdminMode', false);
            }
        }
        catch (error) {
            console.error('Failed to initialize promo codes:', error);
            yield figma.clientStorage.setAsync('promoAvailable', {});
            yield figma.clientStorage.setAsync('promoUsed', []);
            yield figma.clientStorage.setAsync('isAdminMode', false);
        }
    });
}
// Initialize credits and promo codes
initializeCredits();
initializePromoCodes();
// --- Message Handling ---
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        if (msg.type === 'export-selection') {
            yield processSelection((_a = msg.useTableLayout) !== null && _a !== void 0 ? _a : true);
        }
        else if (msg.type === 'resize') {
            if (msg.width && msg.height) {
                figma.ui.resize(msg.width, msg.height);
            }
        }
        else if (msg.type === 'get-credits') {
            yield initializeCredits();
        }
        else if (msg.type === 'reset-credits') {
            const enteredCode = (_b = msg.code) === null || _b === void 0 ? void 0 : _b.trim();
            const secretCode = '2209';
            if (enteredCode === secretCode) {
                yield figma.clientStorage.setAsync('tableCredits', 5);
                figma.ui.postMessage({ type: 'credits', balance: 5 });
            }
            else {
                figma.ui.postMessage({ type: 'error', message: 'Invalid reset code.' });
            }
        }
        else if (msg.type === 'check-code') {
            const code = (_c = msg.code) === null || _c === void 0 ? void 0 : _c.trim();
            if (!code) {
                figma.ui.postMessage({ type: 'error', message: 'Please enter a code.' });
                return;
            }
            if (code === ADMIN_SECRET) {
                const currentAdminMode = (yield figma.clientStorage.getAsync('isAdminMode')) || false;
                const newAdminMode = !currentAdminMode;
                yield figma.clientStorage.setAsync('isAdminMode', newAdminMode);
                figma.ui.postMessage({ type: 'admin-access-granted' });
                return;
            }
            let promoAvailable = (yield figma.clientStorage.getAsync('promoAvailable')) || {};
            let promoUsed = (yield figma.clientStorage.getAsync('promoUsed')) || [];
            if (promoUsed.includes(code)) {
                figma.ui.postMessage({ type: 'error', message: 'Code already used.' });
                return;
            }
            if (code in promoAvailable) {
                const credits = promoAvailable[code];
                let currentCredits = (yield figma.clientStorage.getAsync('tableCredits')) || 0;
                currentCredits += credits;
                delete promoAvailable[code];
                promoUsed.push(code);
                yield figma.clientStorage.setAsync('tableCredits', currentCredits);
                yield figma.clientStorage.setAsync('promoAvailable', promoAvailable);
                yield figma.clientStorage.setAsync('promoUsed', promoUsed);
                figma.ui.postMessage({ type: 'redeem-success', balance: currentCredits });
            }
            else {
                figma.ui.postMessage({ type: 'error', message: 'Invalid promo code.' });
            }
        }
        else if (msg.type === 'admin-generate-code') {
            const isAdminMode = (yield figma.clientStorage.getAsync('isAdminMode')) || false;
            if (!isAdminMode) {
                figma.ui.postMessage({ type: 'error', message: 'Unauthorized access. Please enter admin secret.' });
                return;
            }
            const credits = msg.credits;
            if (!credits || credits < 1 || credits > 100) {
                figma.ui.postMessage({ type: 'error', message: 'Invalid credits amount.' });
                return;
            }
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let generatedCode = '';
            for (let i = 0; i < 8; i++) {
                generatedCode += chars[Math.floor(Math.random() * chars.length)];
            }
            let promoAvailable = (yield figma.clientStorage.getAsync('promoAvailable')) || {};
            promoAvailable[generatedCode] = credits;
            yield figma.clientStorage.setAsync('promoAvailable', promoAvailable);
            figma.ui.postMessage({ type: 'code-generated', code: generatedCode, credits });
        }
        else if (msg.type === 'admin-add-code') {
            const isAdminMode = (yield figma.clientStorage.getAsync('isAdminMode')) || false;
            if (!isAdminMode) {
                figma.ui.postMessage({ type: 'error', message: 'Unauthorized access. Please enter admin secret.' });
                return;
            }
            const code = (_d = msg.code) === null || _d === void 0 ? void 0 : _d.trim();
            const credits = msg.credits;
            if (!code || code.length > 10 || !credits || credits < 1 || credits > 100) {
                figma.ui.postMessage({ type: 'error', message: 'Invalid code or credits.' });
                return;
            }
            let promoAvailable = (yield figma.clientStorage.getAsync('promoAvailable')) || {};
            promoAvailable[code] = credits;
            yield figma.clientStorage.setAsync('promoAvailable', promoAvailable);
            figma.ui.postMessage({ type: 'code-added', code });
        }
        else if (msg.type === 'list-codes') {
            const isAdminMode = (yield figma.clientStorage.getAsync('isAdminMode')) || false;
            if (!isAdminMode) {
                figma.ui.postMessage({ type: 'error', message: 'Unauthorized access. Please enter admin secret.' });
                return;
            }
            const promoAvailable = (yield figma.clientStorage.getAsync('promoAvailable')) || {};
            const codes = Object.entries(promoAvailable).map(([code, credits]) => ({ code, credits }));
            figma.ui.postMessage({ type: 'list-codes', codes });
        }
        else {
            figma.ui.postMessage({ type: 'error', message: `Unknown message type: ${msg.type}` });
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        figma.ui.postMessage({ type: 'error', message: `Backend error: ${message}` });
        console.error('Backend error:', error);
    }
});
// --- Helper function to count tables ---
function countTablesInFrame(frame) {
    let tableCount = 0;
    function traverseNodes(node) {
        if (node.name.startsWith('[table]') && (node.type === 'FRAME' || node.type === 'GROUP')) {
            tableCount++;
        }
        if ('children' in node && node.children) {
            for (const child of node.children) {
                traverseNodes(child);
            }
        }
    }
    traverseNodes(frame);
    return tableCount;
}
// --- Main Processing Logic ---
function processSelection(useTableLayout) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        figma.ui.postMessage({ type: 'progress', message: 'Processing selection...' });
        const selection = figma.currentPage.selection;
        if (selection.length !== 1) {
            figma.ui.postMessage({ type: 'error', message: 'Please select a single Frame to export.' });
            return;
        }
        const topLevelFrame = selection[0];
        if (topLevelFrame.type !== 'FRAME' && topLevelFrame.type !== 'COMPONENT' && topLevelFrame.type !== 'INSTANCE' || !('children' in topLevelFrame)) {
            figma.ui.postMessage({ type: 'error', message: 'Please select a single Frame to export.' });
            return;
        }
        // Count tables before proceeding
        const tableCount = countTablesInFrame(topLevelFrame);
        if (tableCount > 0) {
            try {
                const storedCredits = yield figma.clientStorage.getAsync('tableCredits');
                const currentCredits = typeof storedCredits === 'number' ? storedCredits : 5;
                if (currentCredits < tableCount) {
                    figma.ui.postMessage({
                        type: 'error',
                        message: `Insufficient credits. This export requires ${tableCount} credits, but you have ${currentCredits}. Please purchase more credits.`
                    });
                    return;
                }
                // Deduct credits after validation (will be saved post-processing)
                const newCredits = currentCredits - tableCount;
                yield figma.clientStorage.setAsync('tableCredits', newCredits);
                // Update UI with new balance
                figma.ui.postMessage({ type: 'credits', balance: newCredits });
            }
            catch (error) {
                console.error('Credit storage error:', error);
                figma.ui.postMessage({ type: 'error', message: 'Error managing credits. Please try again.' });
                return;
            }
        }
        const overallBbox = topLevelFrame.absoluteBoundingBox;
        if (!overallBbox) {
            figma.ui.postMessage({ type: 'error', message: 'Could not determine bounds of the selected frame.' });
            return;
        }
        // Figma's `children` array is already ordered from bottom-to-top, which is the correct order for HTML stacking.
        const allNodes = [...topLevelFrame.children];
        const finalAssets = [];
        const previewAssets = [];
        const elements = [];
        const linkPlaceholders = [];
        const gifPlaceholders = [];
        let elementCounter = 0;
        let backgroundAsset = null;
        // Use the Frame's own fill as the background
        const frameFill = (_a = topLevelFrame.fills) === null || _a === void 0 ? void 0 : _a[0];
        if (frameFill) {
            if (frameFill.type === 'IMAGE' && frameFill.imageHash) {
                elementCounter++;
                const assetName = `bg-image-${elementCounter}.png`;
                backgroundAsset = { name: assetName, type: 'image', value: `./images/${assetName}` };
                try {
                    const image = figma.getImageByHash(frameFill.imageHash);
                    if (image) {
                        const data = yield image.getBytesAsync();
                        finalAssets.push({ name: assetName, data: data });
                    }
                    else {
                        backgroundAsset = null;
                    }
                }
                catch (e) {
                    console.warn(`Could not export frame background image`, e);
                    backgroundAsset = null;
                }
            }
            else if (frameFill.type === 'SOLID') {
                const { r, g, b } = frameFill.color;
                backgroundAsset = { name: 'bgcolor', type: 'color', value: `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}` };
            }
        }
        // Collect all processable nodes with their relative positions
        const processableNodes = [];
        for (const node of allNodes) {
            if (!node.visible)
                continue;
            const nodeBbox = node.absoluteBoundingBox;
            if (!nodeBbox)
                continue;
            const relativeX = nodeBbox.x - overallBbox.x;
            const relativeY = nodeBbox.y - overallBbox.y;
            processableNodes.push({ node, relativeX, relativeY });
        }
        // Sort by relativeY ascending (top-to-bottom order for proper stacking)
        processableNodes.sort((a, b) => a.relativeY - b.relativeY);
        // Dynamic offset for elements after expanding components (e.g., table)
        let offset = 0;
        // Now process in sorted order
        for (const { node, relativeX, relativeY } of processableNodes) {
            figma.ui.postMessage({ type: 'progress', message: `Processing: ${node.name}` });
            const nodeBbox = node.absoluteBoundingBox;
            if (!nodeBbox)
                continue;
            // New: Skip full-frame white rectangles to avoid unwanted background export
            if (node.type === 'RECTANGLE' &&
                Math.round(nodeBbox.width) === Math.round(overallBbox.width) &&
                Math.round(nodeBbox.height) === Math.round(overallBbox.height) &&
                Math.round(relativeX) === 0 &&
                Math.round(relativeY) === 0) {
                const fill = (_b = node.fills) === null || _b === void 0 ? void 0 : _b[0];
                if (fill && fill.type === 'SOLID' &&
                    fill.color.r > 0.95 && fill.color.g > 0.95 && fill.color.b > 0.95) {
                    continue; // Skip this node as it's a full-frame white background
                }
            }
            const effectiveY = relativeY + offset;
            let generatedHtml = '';
            // New: Detect and handle tables
            if (node.name.startsWith('[table]') && (node.type === 'FRAME' || node.type === 'GROUP')) {
                const tableResult = yield generateTableHTML(node, relativeX, effectiveY);
                generatedHtml = tableResult.html;
                const delta = tableResult.expectedHeight - nodeBbox.height;
                if (delta > 0) {
                    offset += Math.round(delta); // Apply integer delta to subsequent positions
                }
            }
            else {
                const hasImageFill = 'fills' in node && Array.isArray(node.fills) && node.fills.some((f) => f.type === 'IMAGE');
                if (node.name.startsWith('[gif]')) {
                    const gifId = node.name.substring(5).trim();
                    gifPlaceholders.push({ id: gifId });
                    generatedHtml = generateImageHTML(`./images/${gifId}.gif`, relativeX, effectiveY, nodeBbox.width, nodeBbox.height);
                }
                else if (node.type === 'TEXT') {
                    generatedHtml = yield generateTextHTML(node, relativeX, effectiveY);
                }
                else if (['RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR', 'VECTOR'].includes(node.type) && !hasImageFill) {
                    generatedHtml = generateShapeHTML(node, relativeX, effectiveY);
                }
                else { // Rasterize groups/components/images
                    elementCounter++;
                    const assetName = `image-${elementCounter}.png`;
                    try {
                        let originalFills;
                        if (node.name.startsWith('[transparent]') && 'fills' in node) {
                            originalFills = [...node.fills];
                            node.fills = []; // Temporarily remove fills for transparent export
                        }
                        const data = yield node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
                        if (originalFills && 'fills' in node) {
                            node.fills = originalFills; // Restore original fills
                        }
                        finalAssets.push({ name: assetName, data });
                        generatedHtml = generateImageHTML(`./images/${assetName}`, relativeX, effectiveY, nodeBbox.width, nodeBbox.height);
                    }
                    catch (e) {
                        console.warn(`Could not export node "${node.name}"`, e);
                    }
                }
            }
            if (generatedHtml) {
                // Existing link handling remains unchanged
                if (node.name.startsWith('[link]')) {
                    const urlMatch = node.name.match(/\[link\]\s*(.*)/);
                    const url = (urlMatch && urlMatch[1]) ? urlMatch[1].trim() : '#';
                    elementCounter++;
                    const previewAssetName = `link-preview-${elementCounter}.png`;
                    try {
                        const data = yield node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
                        previewAssets.push({ name: previewAssetName, data });
                        linkPlaceholders.push({ id: node.id, originalUrl: url, previewAssetName });
                        generatedHtml = `<div data-link-placeholder-id="${node.id}">${generatedHtml}</div>`;
                    }
                    catch (e) {
                        console.warn(`Could not create link preview for "${node.name}"`, e);
                    }
                }
                elements.push({ html: generatedHtml });
            }
        }
        const htmlContent = generateFinalHTML(elements.map(e => e.html), overallBbox.width, overallBbox.height, backgroundAsset, useTableLayout);
        const filename = slugify(topLevelFrame.name);
        figma.ui.postMessage({
            type: 'export-result',
            html: htmlContent,
            assets: finalAssets,
            previewAssets: previewAssets,
            gifPlaceholders,
            linkPlaceholders,
            filename
        });
    });
}
function generateShapeHTML(node, x, y) {
    var _a, _b, _c, _d;
    const nodeBbox = node.absoluteBoundingBox;
    if (!nodeBbox)
        return '';
    const tableStyle = {
        position: 'absolute',
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
        width: `${Math.round(nodeBbox.width)}px`,
        height: `${Math.round(nodeBbox.height)}px`,
    };
    const tdStyle = {
        'width': `${Math.round(nodeBbox.width)}px`,
        'height': `${Math.round(nodeBbox.height)}px`,
        'box-sizing': 'border-box',
    };
    const fill = (_a = node.fills) === null || _a === void 0 ? void 0 : _a[0];
    if (fill && fill.type === 'SOLID') {
        const { r, g, b } = fill.color;
        const a = (_b = fill.opacity) !== null && _b !== void 0 ? _b : 1;
        if (a === 1) {
            tdStyle['background-color'] = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
        }
        else {
            tdStyle['background-color'] = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
        }
    }
    const stroke = (_c = node.strokes) === null || _c === void 0 ? void 0 : _c[0];
    const strokeWeight = node.strokeWeight;
    if (stroke && strokeWeight > 0 && stroke.type === 'SOLID') {
        const { r, g, b } = stroke.color;
        const a = (_d = stroke.opacity) !== null && _d !== void 0 ? _d : 1;
        tdStyle.border = `${Math.round(strokeWeight)}px solid rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
    }
    if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
        tdStyle['border-radius'] = `${Math.round(node.cornerRadius)}px`;
    }
    else if ('cornerRadius' in node && node.cornerRadius === figma.mixed) {
        // Handle individual corner radii if cornerRadius is mixed
        const { topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius } = node;
        const radii = `${Math.round(topLeftRadius)}px ${Math.round(topRightRadius)}px ${Math.round(bottomRightRadius)}px ${Math.round(bottomLeftRadius)}px`;
        tdStyle['border-radius'] = radii;
    }
    else if (node.type === 'ELLIPSE') {
        tdStyle['border-radius'] = '50%';
    }
    const tableStyleString = Object.entries(tableStyle).map(([k, v]) => `${k}:${v};`).join(' ');
    const tdStyleString = Object.entries(tdStyle).map(([k, v]) => `${k}:${v};`).join(' ');
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="${tableStyleString}"><tr><td style="${tdStyleString}">&nbsp;</td></tr></table>`;
}
// === generateTableHTML (With expected height calculation for offset) ===
function generateTableHTML(node, x, y) {
    return __awaiter(this, void 0, void 0, function* () {
        if (node.type !== 'FRAME' && node.type !== 'GROUP' || !('children' in node)) {
            return { html: '', expectedHeight: 0 };
        }
        const nodeBbox = node.absoluteBoundingBox;
        if (!nodeBbox) {
            return { html: '', expectedHeight: 0 };
        }
        // --- Collect all visible TEXT nodes recursively ---
        const allTextNodes = [];
        function collectNodes(current) {
            if (current.type === 'TEXT' && current.visible && current.absoluteBoundingBox) {
                allTextNodes.push({ node: current, bbox: current.absoluteBoundingBox });
            }
            else if ('children' in current && current.visible) {
                for (const child of current.children)
                    collectNodes(child);
            }
        }
        collectNodes(node);
        if (allTextNodes.length === 0) {
            return { html: '', expectedHeight: 0 };
        }
        // --- Collect all filled shapes to check background colors ---
        const filledShapes = node.children.filter(c => 'fills' in c && Array.isArray(c.fills) && c.fills.length > 0);
        // Helper: detect color behind a text node
        function detectColorBehind(bbox) {
            for (const shape of filledShapes) {
                const sbox = shape.absoluteBoundingBox;
                if (!sbox)
                    continue;
                const withinX = bbox.x + bbox.width / 2 >= sbox.x - 5 && bbox.x + bbox.width / 2 <= sbox.x + sbox.width + 5;
                const withinY = bbox.y + bbox.height / 2 >= sbox.y - 5 && bbox.y + bbox.height / 2 <= sbox.y + sbox.height + 5;
                if (withinX && withinY) {
                    const fills = shape.fills;
                    const fill = fills && fills[0];
                    if (fill && fill.type === 'SOLID') {
                        const { r, g, b } = fill.color;
                        const hex = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
                        // ignore white / near-white
                        const brightness = (r * 299 + g * 587 + b * 114) * 255 / 1000;
                        if (brightness < 240)
                            return hex;
                    }
                }
            }
            return ''; // not found
        }
        // --- Group text into rows by Y position (tolerance 5px) ---
        const rowsMap = new Map();
        for (const t of allTextNodes) {
            const rowKey = Math.round(t.bbox.y / 5) * 5;
            if (!rowsMap.has(rowKey))
                rowsMap.set(rowKey, []);
            rowsMap.get(rowKey).push(t);
        }
        const sortedRows = Array.from(rowsMap.values()).sort((a, b) => a[0].bbox.y - b[0].bbox.y);
        // --- Calculate total width for proper proportional td widths ---
        const totalWidth = nodeBbox.width;
        // --- Build table HTML ---
        let headerHtml = '', bodyHtml = '';
        const baseBorderColor = '#f06522';
        const cornerRadius = 7;
        for (let i = 0; i < sortedRows.length; i++) {
            const row = sortedRows[i].sort((a, b) => a.bbox.x - b.bbox.x);
            let cellsHtml = '';
            const isHeader = i === 0;
            for (let j = 0; j < row.length; j++) {
                const entry = row[j];
                const cellContent = yield generateTextHTMLWithoutTable(entry.node, 0, 0);
                // Get text color and brightness
                const textFills = entry.node.fills;
                const textFill = textFills[0];
                let textBrightness = 0;
                if (textFill && textFill.type === 'SOLID') {
                    const { r, g, b } = textFill.color;
                    textBrightness = (r * 299 + g * 587 + b * 114) / 1000 * 255;
                }
                // Detect cell background color
                let bgColor = detectColorBehind(entry.bbox);
                // Overlap fix: If detected bg is dark and text is dark, force white bg
                if (bgColor) {
                    const bgR = parseInt(bgColor.slice(1, 3), 16) / 255;
                    const bgG = parseInt(bgColor.slice(3, 5), 16) / 255;
                    const bgB = parseInt(bgColor.slice(5, 7), 16) / 255;
                    const bgBrightness = (bgR * 299 + bgG * 587 + bgB * 114) / 1000 * 255;
                    if (bgBrightness < 128 && textBrightness < 128) {
                        bgColor = '#ffffff';
                    }
                }
                if (!bgColor) {
                    bgColor = isHeader ? baseBorderColor : '#ffffff';
                }
                // Border radius logic
                let borderRadius = '';
                if (isHeader && j === 0)
                    borderRadius = `border-radius:${cornerRadius}px 0 0 0;`;
                else if (isHeader && j === row.length - 1)
                    borderRadius = `border-radius:0 ${cornerRadius}px 0 0;`;
                else if (i === sortedRows.length - 1 && j === 0)
                    borderRadius = `border-radius:0 0 0 ${cornerRadius}px;`;
                else if (i === sortedRows.length - 1 && j === row.length - 1)
                    borderRadius = `border-radius:0 0 ${cornerRadius}px 0;`;
                // Proportional width (percentage)
                const cellWidth = (entry.bbox.width / totalWidth) * 100;
                cellsHtml += `
                <td align="left" valign="middle"
                    width="${cellWidth.toFixed(2)}%"
                    style="
                        ${borderRadius}
                        background:${bgColor};
                        color:${isHeader ? '#ffffff' : '#000000'};
                        font-weight:${isHeader ? 'bold' : 'normal'};
                        border:2px solid ${baseBorderColor};
                        padding:8px 10px;
                        font-family:'Roboto', Arial, Helvetica, sans-serif;
                        font-size:13px;
                        line-height:18px;
                        box-sizing:border-box;
                    ">
                    ${cellContent}
                </td>`;
            }
            const rowHtml = `<tr>${cellsHtml}</tr>`;
            if (isHeader)
                headerHtml += rowHtml;
            else
                bodyHtml += rowHtml;
        }
        // Compute expected height for offset calculation
        const numRows = sortedRows.length;
        const rowHeight = 34; // line-height (18px) + vertical padding (16px)
        const borderOverhead = 14; // approximate for table borders and radius
        const expectedHeight = numRows * rowHeight + borderOverhead;
        const parentTableStyle = `
        position:absolute;
        left:${Math.round(x)}px;
        top:${Math.round(y)}px;
        width:${Math.round(nodeBbox.width)}px;
    `;
        const innerTableStyle = `
        width:100%;
        border-collapse:separate;
        border-spacing:0;
        border-radius:${cornerRadius}px;
        overflow:hidden;
    `;
        const html = `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="${parentTableStyle}">
        <tr><td>
            <table role="presentation" width="100%" border="0" cellpadding="5" cellspacing="0" style="${innerTableStyle}">
                <thead>${headerHtml}</thead>
                <tbody>${bodyHtml}</tbody>
            </table>
        </td></tr>
    </table>`;
        return { html, expectedHeight };
    });
}
// Helper: Generate text HTML without outer table wrapper (for table cells)
function generateTextHTMLWithoutTable(node, x, y) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Get an array of segments, each with its own style properties
        const segments = node.getStyledTextSegments([
            'fontName',
            'fontWeight',
            'fontSize',
            'fills',
            'lineHeight',
            'textDecoration',
        ]);
        // Create a unique set of fonts to load
        const fontsToLoad = new Map();
        for (const segment of segments) {
            const font = segment.fontName;
            fontsToLoad.set(`${font.family}-${font.style}`, font);
        }
        // Load all necessary fonts in parallel
        try {
            yield Promise.all(Array.from(fontsToLoad.values()).map(font => figma.loadFontAsync(font)));
        }
        catch (e) {
            figma.notify(`Could not load some fonts. Using fallbacks.`);
        }
        // Build HTML content by creating a <span> for each styled segment
        let segmentsHtml = '';
        for (const segment of segments) {
            const text = node.characters.slice(segment.start, segment.end).replace(/\n/g, '<br>');
            if (text.length === 0)
                continue;
            const spanStyle = {};
            const fontName = segment.fontName;
            const firstFill = (_a = segment.fills) === null || _a === void 0 ? void 0 : _a[0];
            // --- Per-segment styles for the <span> ---
            spanStyle['font-family'] = `'${fontName.family}', Arial, Verdana, sans-serif`;
            const fontSizePx = Number(segment.fontSize);
            spanStyle['font-size'] = `${fontSizePx * 0.75}pt`;
            spanStyle['font-weight'] = segment.fontWeight;
            if (firstFill && firstFill.type === 'SOLID') {
                const { r, g, b } = firstFill.color;
                spanStyle.color = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
            }
            const lineHeight = segment.lineHeight;
            if (lineHeight.unit === 'PIXELS') {
                spanStyle['line-height'] = `${Math.round(lineHeight.value)}px`;
            }
            else if (lineHeight.unit === 'PERCENT') {
                spanStyle['line-height'] = `${lineHeight.value}%`;
            }
            const textDecoration = segment.textDecoration;
            if (textDecoration === 'UNDERLINE') {
                spanStyle['text-decoration'] = 'underline';
            }
            else if (textDecoration === 'STRIKETHROUGH') {
                spanStyle['text-decoration'] = 'line-through';
            }
            const spanStyleString = Object.entries(spanStyle).map(([k, v]) => `${k}:${v};`).join(' ');
            segmentsHtml += `<span style="${spanStyleString}">${text}</span>`;
        }
        // --- Parent styles (without table wrapper) ---
        // These set overall properties like text-align and line-height for MSO fix
        const parentStyle = {
            padding: 0,
            margin: 0,
            'text-align': node.textAlignHorizontal.toLowerCase(),
            'white-space': 'normal', // Changed to allow wrapping and prevent overflow
            'word-wrap': 'break-word', // Break long words if needed
            display: 'inline-block', // Ensure it fits within td
        };
        // Apply overall line height for MSO fix
        if (typeof node.lineHeight !== 'symbol' && node.lineHeight.unit === 'PIXELS') {
            const lineHeightPx = node.lineHeight.value;
            parentStyle['line-height'] = `${Math.round(lineHeightPx)}px`;
            parentStyle['mso-line-height-rule'] = 'exactly'; // Outlook fix
        }
        else if (typeof node.lineHeight !== 'symbol' && node.lineHeight.unit === 'PERCENT') {
            parentStyle['line-height'] = `${node.lineHeight.value}%`;
        }
        const parentStyleString = Object.entries(parentStyle).map(([k, v]) => `${k}:${v};`).join(' ');
        // Return wrapped segments without positioning (handled by td)
        return `<div style="${parentStyleString}">${segmentsHtml}</div>`;
    });
}
function generateTextHTML(node, x, y) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Get an array of segments, each with its own style properties
        const segments = node.getStyledTextSegments([
            'fontName',
            'fontWeight',
            'fontSize',
            'fills',
            'lineHeight',
            'textDecoration',
        ]);
        // Create a unique set of fonts to load
        const fontsToLoad = new Map();
        for (const segment of segments) {
            const font = segment.fontName;
            fontsToLoad.set(`${font.family}-${font.style}`, font);
        }
        // Load all necessary fonts in parallel
        try {
            yield Promise.all(Array.from(fontsToLoad.values()).map(font => figma.loadFontAsync(font)));
        }
        catch (e) {
            figma.notify(`Could not load some fonts. Using fallbacks.`, { error: true });
            console.warn("Font loading error:", e);
        }
        // Build HTML content by creating a <span> for each styled segment
        let segmentsHtml = '';
        for (const segment of segments) {
            const text = node.characters.slice(segment.start, segment.end).replace(/\n/g, '<br>');
            if (text.length === 0)
                continue;
            const spanStyle = {};
            const fontName = segment.fontName;
            const firstFill = (_a = segment.fills) === null || _a === void 0 ? void 0 : _a[0];
            // --- Per-segment styles for the <span> ---
            spanStyle['font-family'] = `'${fontName.family}', Arial, Verdana, sans-serif`;
            const fontSizePx = Number(segment.fontSize);
            spanStyle['font-size'] = `${fontSizePx * 0.75}pt`;
            spanStyle['font-weight'] = segment.fontWeight;
            if (firstFill && firstFill.type === 'SOLID') {
                const { r, g, b } = firstFill.color;
                spanStyle.color = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
            }
            const lineHeight = segment.lineHeight;
            if (lineHeight.unit === 'PIXELS') {
                spanStyle['line-height'] = `${Math.round(lineHeight.value)}px`;
            }
            else if (lineHeight.unit === 'PERCENT') {
                spanStyle['line-height'] = `${lineHeight.value}%`;
            }
            const textDecoration = segment.textDecoration;
            if (textDecoration === 'UNDERLINE') {
                spanStyle['text-decoration'] = 'underline';
            }
            else if (textDecoration === 'STRIKETHROUGH') {
                spanStyle['text-decoration'] = 'line-through';
            }
            const spanStyleString = Object.entries(spanStyle).map(([k, v]) => `${k}:${v};`).join(' ');
            segmentsHtml += `<span style="${spanStyleString}">${text}</span>`;
        }
        const tableStyle = {
            position: 'absolute',
            left: `${Math.round(x)}px`,
            top: `${Math.round(y)}px`,
            width: `${Math.round(node.width)}px`,
            height: `${Math.round(node.height)}px`,
        };
        // --- Parent <td> styles ---
        // These act as a fallback and set overall properties like text-align
        const tdStyle = {
            padding: 0,
            margin: 0,
            'text-align': node.textAlignHorizontal.toLowerCase(),
            'white-space': 'nowrap',
        };
        // Apply overall line height for MSO fix
        if (typeof node.lineHeight !== 'symbol' && node.lineHeight.unit === 'PIXELS') {
            const lineHeightPx = node.lineHeight.value;
            tdStyle['line-height'] = `${Math.round(lineHeightPx)}px`;
            tdStyle['mso-line-height-rule'] = 'exactly'; // Outlook fix
        }
        else if (typeof node.lineHeight !== 'symbol' && node.lineHeight.unit === 'PERCENT') {
            tdStyle['line-height'] = `${node.lineHeight.value}%`;
        }
        const tableStyleString = Object.entries(tableStyle).map(([k, v]) => `${k}:${v};`).join(' ');
        const tdStyleString = Object.entries(tdStyle).map(([k, v]) => `${k}:${v};`).join(' ');
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="${tableStyleString}"><tr><td style="${tdStyleString}">${segmentsHtml}</td></tr></table>`;
    });
}
function generateImageHTML(src, x, y, width, height) {
    var _a;
    const tableStyle = `position: absolute; left: ${Math.round(x)}px; top: ${Math.round(y)}px; width: ${Math.round(width)}px; height: ${Math.round(height)}px;`;
    const altText = ((_a = src.split('/').pop()) === null || _a === void 0 ? void 0 : _a.split('.')[0]) || 'export image';
    const imgTag = `<img src="${src}" alt="${altText}" width="${Math.round(width)}" height="${Math.round(height)}" style="display: block; border: 0; width: 100%; height: auto;">`;
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="${tableStyle}"><tr><td>${imgTag}</td></tr></table>`;
}
// ... [YOUR ORIGINAL CODE UP TO slugify REMains UNCHANGED]
// Do NOT redeclare anything here. Paste the new code BELOW your existing slugify function.
// -------------------------------------------------------------
// NEW: Email Converter Functions (Add these after your existing code)
// -------------------------------------------------------------
function cleanStyle(styleStr, propsToRemove) {
    if (!styleStr)
        return '';
    const rules = styleStr.split(';').map(r => r.trim()).filter(r => r);
    const cleaned = rules.map(rule => {
        const parts = rule.split(':');
        if (parts.length < 2)
            return null;
        const prop = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(':').trim();
        if (!propsToRemove.includes(prop))
            return `${parts[0].trim()}:${val}`;
        return null;
    }).filter(Boolean);
    return cleaned.join('; ') + (cleaned.length ? ';' : '');
}
function extractProp(styleStr, prop) {
    const m = styleStr.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i'));
    return m ? m[1].trim() : null;
}
function extractAlignment(styleStr, el) {
    const textAlign = extractProp(styleStr, 'text-align') || el.getAttribute('align') || 'left';
    const verticalAlign = extractProp(styleStr, 'vertical-align') || el.getAttribute('valign') || 'top';
    return { textAlign, verticalAlign };
}
function getElementHeight(el) {
    const style = el.getAttribute('style') || '';
    let heightStr = extractProp(style, 'height');
    let height = heightStr ? parseInt(heightStr.replace(/[^\d]/g, '')) : 0;
    if (!height) {
        const heightAttr = el.getAttribute('height');
        height = heightAttr ? parseInt(heightAttr) : 0;
    }
    const padTop = parseInt(extractProp(style, 'padding-top') || '0');
    const padBottom = parseInt(extractProp(style, 'padding-bottom') || '0');
    return (height || 100) + padTop + padBottom;
}
function convertEmailLayout(intermediateHtml, containerWidth, containerHeight, background) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="root">${intermediateHtml}</div>`, 'text/html');
    const relativeDiv = doc.querySelector('#root');
    if (!relativeDiv)
        return intermediateHtml; // Fallback
    relativeDiv.setAttribute('style', `position:relative; width:${containerWidth}px; height:${containerHeight}px;`);
    const allTables = Array.from(relativeDiv.querySelectorAll('table'));
    const positionedTables = allTables.filter(t => {
        const s = (t.getAttribute('style') || '').toLowerCase();
        return /position\s*:\s*absolute/i.test(s);
    });
    const positionedElements = [];
    let minHeightNeeded = 0;
    positionedTables.forEach(table => {
        const style = table.getAttribute('style') || '';
        const top = parseInt(extractProp(style, 'top') || '0');
        const left = parseInt(extractProp(style, 'left') || '0');
        let widthStr = extractProp(style, 'width') || containerWidth.toString();
        const width = parseInt(widthStr.replace(/[^\d]/g, ''));
        const alignment = extractAlignment(style, table);
        const cleaned = cleanStyle(style, ['position', 'top', 'left']);
        table.setAttribute('style', cleaned);
        let el = table;
        const parent = table.parentNode;
        if (parent && parent.tagName === 'A' && parent.getAttribute('href'))
            el = parent;
        const elHeight = getElementHeight(el);
        const bottomEdge = top + elHeight;
        if (bottomEdge > minHeightNeeded)
            minHeightNeeded = bottomEdge;
        positionedElements.push({ el, top, left, width: Math.min(width, containerWidth), height: elHeight, alignment });
    });
    positionedElements.sort((a, b) => a.top - b.top || a.left - b.left);
    const borderWidth = 1;
    const innerWidth = containerWidth - 2 * borderWidth;
    const finalHeight = minHeightNeeded + 2 * borderWidth + 10;
    const innerHeight = finalHeight - 2 * borderWidth;
    return buildEmailStructure(containerWidth, finalHeight, innerWidth, innerHeight, positionedElements, background);
}
function buildEmailStructure(containerWidth, containerHeight, innerWidth, innerHeight, positionedElements, background) {
    const serialize = (node) => node.outerHTML.replace(/xmlns="[^"]*"/g, '');
    let html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>Mailer</title>
<!--[if gte mso 9]>
<xml>
  <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<style>
    body{margin:0;padding:0;background:transparent;}
    table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
    td{padding:0;vertical-align:top;}
    img{-ms-interpolation-mode:bicubic;border:0;display:block;}
    .email-container span{line-height:1.2 !important;}
    .email-container td{padding-bottom:5px !important;vertical-align:top !important; text-align:inherit !important;}
    .email-container table[style*="top:811px"] td{padding-top:10px !important;}
    .email-container a{display:block !important;text-decoration:none !important;pointer-events:auto !important;}
    .email-container { border: 1px solid #dddddd !important; box-sizing: border-box; }
    .email-container td, .email-container table { text-align: inherit !important; vertical-align: inherit !important; }
    @media screen and (max-width:480px){
        .email-container td{padding:0 10px !important;text-align:center !important;}
        .email-container img{width:100% !important;height:auto !important;}
    }
</style>
</head>
<body style="margin:0;padding:0;background:transparent;">
<center>
<!--[if mso]>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${containerWidth}"><tr><td>
<![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${containerWidth}"
       style="width:${containerWidth}px;height:${containerHeight}px;">
  <tr>
    <td bgcolor="${(background === null || background === void 0 ? void 0 : background.type) === 'color' ? background.value : '#ffffff'}" 
        background="${(background === null || background === void 0 ? void 0 : background.type) === 'image' ? background.value : ''}"
        width="${containerWidth}" height="${containerHeight}"
        valign="top" class="email-container"
        style="position:relative;background:#fff;border:1px solid #dddddd;box-sizing:border-box;width:${innerWidth}px;height:${innerHeight}px; background-image:url(${(background === null || background === void 0 ? void 0 : background.type) === 'image' ? background.value : ''}); background-position: center; background-repeat: no-repeat; background-size: cover;">
      <!--[if gte mso 9]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false"
              style="width:${containerWidth}px;height:${containerHeight}px;">
        <v:fill type="frame" src="${(background === null || background === void 0 ? void 0 : background.type) === 'image' ? background.value : ''}" color="${(background === null || background === void 0 ? void 0 : background.type) === 'color' ? background.value : '#ffffff'}"/>
        <v:textbox inset="0,0,0,0">
      <![endif]-->

      ${positionedElements.map(({ el, top, left, width, alignment }) => {
        const rightPad = innerWidth - left - width;
        const innerHTML = serialize(el);
        const alignStyle = `text-align:${alignment.textAlign}; vertical-align:${alignment.verticalAlign};`;
        if (el.tagName === 'A') {
            return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0"
             style="position:absolute;top:${top}px;left:${left}px;width:${width}px;">
        <tr>
          <td style="padding:0; ${alignStyle}">
            ${innerHTML}
          </td>
        </tr>
      </table>`;
        }
        else {
            return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0"
             style="position:absolute;top:${top}px;left:0;width:${innerWidth}px;">
        <tr>
          <td width="${left}" style="width:${left}px;"></td>
          <td width="${width}" style="width:${width}px; ${alignStyle}">${innerHTML}</td>
          <td width="${rightPad}" style="width:${rightPad}px;"></td>
        </tr>
      </table>`;
        }
    }).join('\n')}

      <!--[if gte mso 9]>
        </v:textbox>
      </v:rect>
      <![endif]-->
    </td>
  </tr>
</table>
<!--[if mso]>
</td></tr></table>
<![endif]-->
</center>
</body>
</html>`;
    return html;
}
// -------------------------------------------------------------
// REPLACE YOUR EXISTING generateFinalHTML WITH THIS VERSION
// -------------------------------------------------------------
function generateFinalHTML(elements, width, height, background, useTableLayout) {
    const title = "Mailer";
    const bodyStyles = `margin: 0; padding: 0; background-color: transparent;`;
    const roundedWidth = Math.round(width);
    let roundedHeight = Math.round(height);
    const headStyle = `
        body{${bodyStyles}}
        table{border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;}
        td{padding:0;vertical-align:top;}
        img{-ms-interpolation-mode:bicubic; border:0; display:block; outline:none; text-decoration:none; height:auto;}
    `;
    if (useTableLayout) {
        // Build intermediate HTML for converter
        const intermediate = `<div style="position:relative; width:${roundedWidth}px; height:${roundedHeight}px;">${elements.join('\n')}</div>`;
        // Run converter - pass background directly
        return convertEmailLayout(intermediate, roundedWidth, roundedHeight, background);
    }
    // Original non-email mode
    const bgColor = (background === null || background === void 0 ? void 0 : background.type) === 'color' ? background.value : '#ffffff';
    const bgImage = (background === null || background === void 0 ? void 0 : background.type) === 'image' ? background.value : '';
    const bodyContent = `
        <center>
        <!--[if mso]>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${roundedWidth}">
        <tr>
        <td>
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${roundedWidth}" style="width:${roundedWidth}px; height:${roundedHeight}px;">
            <tr>
                <td background="${bgImage}" bgcolor="${bgColor}" width="${roundedWidth}" height="${roundedHeight}" valign="top" style="background-image:url(${bgImage}); background-position: center center; background-repeat: no-repeat; background-size: cover;">
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${roundedWidth}px;height:${roundedHeight}px;">
                    <v:fill type="frame" src="${bgImage}" color="${bgColor}" />
                    <v:textbox inset="0,0,0,0">
                    <![endif]-->
                    <div style="position:relative; width:${roundedWidth}px; height:${roundedHeight}px;">
                        ${elements.join('\n')}
                    </div>
                    <!--[if gte mso 9]>
                    </v:textbox>
                    </v:rect>
                    <![endif]-->
                </td>
            </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
        </center>
    `;
    return `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="UTF-8"><meta name="x-apple-disable-message-reformatting"><title>${title}</title><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--><style>${headStyle}</style></head><body style="margin:0; padding:0; background-color:transparent;">${bodyContent}</body></html>`;
}
// ... [End of file - your slugify can stay if not replaced]
function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}
