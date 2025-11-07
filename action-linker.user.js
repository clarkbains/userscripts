// ==UserScript==
// @name         GitHub Repository Reference Linker
// @namespace    http://tampermonkey.net/
// @version      2025-11-07.9
// @description  Converts text like OrgName/repo/path@branch to clickable GitHub links (handles fragmented text and textareas)
// @author       Clark Bains
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @updateURL    https://raw.githubusercontent.com/clarkbains/userscripts/master/action-linker.user.js
// @downloadURL  https://raw.githubusercontent.com/clarkbains/userscripts/master/action-linker.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 GitHub Repository Reference Linker: Active');

    // Regex pattern to match: OrgName/RepoName/optional/path@branch
    const repoRefPattern = /\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(\/[A-Za-z0-9_.\/-]*)?@([A-Za-z0-9_.\/-]+)\b/g;

    /**
     * Build GitHub URL from match components
     */
    function buildGitHubURL(org, repo, path, branch) {
        const cleanPath = path ? path.substring(1) : '';
        let url = `https://github.com/${org}/${repo}/tree/${branch}`;
        if (cleanPath) {
            url += `/${cleanPath}`;
        }
        return url;
    }

    /**
     * Get character position from mouse coordinates in textarea
     * This is approximate based on font metrics
     */
    function getCharPositionFromMouse(textarea, mouseX, mouseY) {
        const rect = textarea.getBoundingClientRect();
        const style = window.getComputedStyle(textarea);

        // Get font metrics
        const fontSize = parseFloat(style.fontSize);
        const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;

        // Calculate relative position
        const relativeX = mouseX - rect.left - paddingLeft;
        const relativeY = mouseY - rect.top - paddingTop + textarea.scrollTop;

        // Estimate character width (monospace assumption)
        const charWidth = fontSize * 0.6; // Approximate for monospace fonts

        // Calculate line and column
        const line = Math.floor(relativeY / lineHeight);
        const col = Math.floor(relativeX / charWidth);

        // Convert to character position
        const lines = textarea.value.split('\n');
        let position = 0;

        for (let i = 0; i < line && i < lines.length; i++) {
            position += lines[i].length + 1; // +1 for newline
        }

        if (line < lines.length) {
            position += Math.min(col, lines[line].length);
        }

        return position;
    }

    /**
     * Check if position is within any pattern match
     */
    function isPositionInPattern(text, position) {
        const matches = [...text.matchAll(repoRefPattern)];

        for (const match of matches) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            if (position >= matchStart && position <= matchEnd) {
                return true;
            }
        }

        return false;
    }

    /**
     * Add click handler to readonly textareas
     */
    function addTextareaClickHandler(textarea) {
        // Check if already processed
        if (textarea.dataset.linkConverterProcessed) {
            return;
        }
        textarea.dataset.linkConverterProcessed = 'true';

        // Store original cursor style
        const originalCursor = textarea.style.cursor || 'text';

        textarea.addEventListener('click', function(e) {
            const text = textarea.value;
            const clickPosition = textarea.selectionStart;

            // Find all matches in the text
            const matches = [...text.matchAll(repoRefPattern)];

            // Check if click position is within any match
            for (const match of matches) {
                const matchStart = match.index;
                const matchEnd = matchStart + match[0].length;

                if (clickPosition >= matchStart && clickPosition <= matchEnd) {
                    const [fullMatch, org, repo, path, branch] = match;
                    const url = buildGitHubURL(org, repo, path, branch);

                    console.log('🔗 Opening:', url);
                    window.open(url, '_blank');
                    e.preventDefault();
                    return;
                }
            }
        });

        // Add hover effect - change cursor when over a pattern
        textarea.addEventListener('mousemove', function(e) {
            const text = textarea.value;

            // Quick check if there are any patterns at all
            if (!repoRefPattern.test(text)) {
                textarea.style.cursor = originalCursor;
                return;
            }
            repoRefPattern.lastIndex = 0;

            // Get approximate character position from mouse
            const position = getCharPositionFromMouse(textarea, e.clientX, e.clientY);

            // Check if hovering over a pattern
            if (isPositionInPattern(text, position)) {
                textarea.style.cursor = 'pointer';
                textarea.title = 'Click to open in GitHub';
            } else {
                textarea.style.cursor = originalCursor;
                textarea.title = '';
            }
        });

        // Reset cursor when mouse leaves
        textarea.addEventListener('mouseleave', function() {
            textarea.style.cursor = originalCursor;
            textarea.title = '';
        });
    }

    /**
     * Check if we should skip processing this element
     */
    function shouldSkipElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Skip specific tag types
        const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'A', 'INPUT'];
        if (skipTags.includes(element.tagName)) {
            return true;
        }

        // Special handling for TEXTAREA
        if (element.tagName === 'TEXTAREA') {
            const isReadonly = element.hasAttribute('readonly') ||
                             element.readOnly === true ||
                             element.getAttribute('aria-readonly') === 'true';

            if (isReadonly) {
                // Add click handler instead of DOM modification
                addTextareaClickHandler(element);
            }

            // Always skip TEXTAREA for DOM processing (can't render HTML inside)
            return true;
        }

        // Skip contenteditable elements (but not if they're explicitly false)
        if (element.contentEditable === 'true' ||
            (element.isContentEditable && element.contentEditable !== 'false')) {
            return true;
        }

        // Skip CodeMirror editor elements
        if (element.classList && element.classList.contains('cm-editor')) {
            return true;
        }

        return false;
    }

    /**
     * Get the combined text content from a container, preserving structure
     */
    function getCombinedText(element) {
        let text = '';
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            text += node.textContent;
        }

        return text;
    }

    /**
     * Create a GitHub link element
     */
    function createLinkElement(match, org, repo, path, branch) {
        const url = buildGitHubURL(org, repo, path, branch);

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.cssText = 'text-decoration: none; color: inherit; cursor: pointer;';
        link.textContent = match;

        return link;
    }

    /**
     * Process a container element that might have fragmented text
     */
    function processContainer(container) {
        const combinedText = getCombinedText(container);
        const matches = [...combinedText.matchAll(repoRefPattern)];

        if (matches.length === 0) {
            return false;
        }

        matches.forEach(match => {
            const fullMatch = match[0];
            const [, org, repo, path, branch] = match;

            const matchIndex = match.index;
            const matchEnd = matchIndex + fullMatch.length;

            const textNodes = [];
            let currentPosition = 0;

            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                const nodeLength = node.textContent.length;
                textNodes.push({
                    node: node,
                    start: currentPosition,
                    end: currentPosition + nodeLength,
                    text: node.textContent
                });
                currentPosition += nodeLength;
            }

            const involvedNodes = textNodes.filter(tn =>
                tn.start < matchEnd && tn.end > matchIndex
            );

            if (involvedNodes.length === 0) return;

            const link = createLinkElement(fullMatch, org, repo, path, branch);

            if (involvedNodes.length === 1) {
                const tn = involvedNodes[0];
                const localStart = matchIndex - tn.start;
                const localEnd = matchEnd - tn.start;

                const before = tn.text.substring(0, localStart);
                const after = tn.text.substring(localEnd);

                const parent = tn.node.parentNode;

                if (before) {
                    parent.insertBefore(document.createTextNode(before), tn.node);
                }
                parent.insertBefore(link, tn.node);
                if (after) {
                    parent.insertBefore(document.createTextNode(after), tn.node);
                }
                parent.removeChild(tn.node);
            } else {
                const firstNode = involvedNodes[0];
                const lastNode = involvedNodes[involvedNodes.length - 1];

                link.textContent = fullMatch;

                const insertPoint = firstNode.node.parentNode;
                const referenceNode = firstNode.node;

                if (firstNode.start < matchIndex) {
                    const beforeText = firstNode.text.substring(0, matchIndex - firstNode.start);
                    insertPoint.insertBefore(document.createTextNode(beforeText), referenceNode);
                }

                insertPoint.insertBefore(link, referenceNode);

                if (lastNode.end > matchEnd) {
                    const afterText = lastNode.text.substring(matchEnd - lastNode.start);
                    insertPoint.insertBefore(document.createTextNode(afterText), referenceNode);
                }

                involvedNodes.forEach(tn => {
                    const parent = tn.node.parentNode;
                    parent.removeChild(tn.node);

                    if (parent.tagName === 'SPAN' && parent.childNodes.length === 0 && parent !== container) {
                        parent.parentNode?.removeChild(parent);
                    }
                });
            }
        });

        return matches.length > 0;
    }

    function getNextNode(node, container) {
        if (node.firstChild) return node.firstChild;

        while (node) {
            if (node === container) return null;
            if (node.nextSibling) return node.nextSibling;
            node = node.parentNode;
        }

        return null;
    }

    /**
     * Process text nodes and replace patterns with links
     */
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;

            if (repoRefPattern.test(text)) {
                repoRefPattern.lastIndex = 0;

                const newHTML = text.replace(repoRefPattern, (match, org, repo, path, branch) => {
                    const url = buildGitHubURL(org, repo, path, branch);
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit;">${match}</a>`;
                });

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newHTML;

                const fragment = document.createDocumentFragment();
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }
                node.parentNode.replaceChild(fragment, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (shouldSkipElement(node)) {
                return;
            }

            if (node.classList && (
                node.classList.contains('diff-text-inner') ||
                node.classList.contains('blob-code-inner') ||
                node.classList.contains('pl-s')
            )) {
                processContainer(node);
            } else {
                const children = Array.from(node.childNodes);
                children.forEach(child => processNode(child));
            }
        }
    }

    /**
     * Observe DOM changes
     */
    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    processNode(node);
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Initialize the script
     */
    function init() {
        if (!document.body) {
            setTimeout(init, 100);
            return;
        }

        processNode(document.body);
        observeDOM();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
