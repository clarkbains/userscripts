// ==UserScript==
// @name         GitHub Repository Reference Linker
// @namespace    http://tampermonkey.net/
// @version      2025-11-07.6
// @description  Converts text like OrgName/repo/path@branch to clickable GitHub links (handles fragmented text)
// @author       Clark Bains
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @updateURL    https://raw.githubusercontent.com/clarkbains/userscripts/master/action-linker.js
// @downloadURL  https://raw.githubusercontent.com/clarkbains/userscripts/master/action-linker.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 GitHub Repository Reference Linker: Active');

    // Regex pattern to match: OrgName/RepoName/optional/path@branch
    const repoRefPattern = /\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(\/[A-Za-z0-9_.\/-]*)?@([A-Za-z0-9_.\/-]+)\b/g;

    /**
     * Check if we should skip processing this element
     */
    function shouldSkipElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Skip specific tag types
        const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'A', 'INPUT'];
        if (skipTags.includes(element.tagName)) {
            return true;
        }

        // Skip contenteditable elements
        if (element.isContentEditable || element.contentEditable === 'true') {
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
        const cleanPath = path ? path.substring(1) : '';
        
        let url = `https://github.com/${org}/${repo}/tree/${branch}`;
        if (cleanPath) {
            url += `/${cleanPath}`;
        }
        
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
        // Get the combined text from all text nodes
        const combinedText = getCombinedText(container);
        
        // Check if the combined text matches our pattern
        const matches = [...combinedText.matchAll(repoRefPattern)];
        
        if (matches.length === 0) {
            return false;
        }
        
        // Process each match
        matches.forEach(match => {
            const fullMatch = match[0];
            const [, org, repo, path, branch] = match;
            
            // Find the position in combined text
            const matchIndex = match.index;
            const matchEnd = matchIndex + fullMatch.length;
            
            // Find all text nodes and their positions in the combined text
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
            
            // Find which text nodes are involved in this match
            const involvedNodes = textNodes.filter(tn => 
                tn.start < matchEnd && tn.end > matchIndex
            );
            
            if (involvedNodes.length === 0) return;
            
            // Create the link element
            const link = createLinkElement(fullMatch, org, repo, path, branch);
            
            // Handle single node case (simple)
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
                // Multi-node case - we need to wrap across elements
                const firstNode = involvedNodes[0];
                const lastNode = involvedNodes[involvedNodes.length - 1];
                
                // Create a wrapper span to hold the link content
                const wrapper = document.createElement('span');
                wrapper.style.cssText = 'display: inline;';
                
                // Collect all the content and elements between
                let currentNode = firstNode.node;
                const nodesToRemove = [];
                const contentParts = [];
                
                while (currentNode) {
                    if (currentNode.nodeType === Node.TEXT_NODE) {
                        const tn = involvedNodes.find(n => n.node === currentNode);
                        if (tn) {
                            let text = tn.text;
                            
                            // Trim first node
                            if (tn === firstNode) {
                                const localStart = matchIndex - tn.start;
                                text = text.substring(localStart);
                            }
                            
                            // Trim last node
                            if (tn === lastNode) {
                                const localEnd = matchEnd - tn.start;
                                text = text.substring(0, localEnd - (tn === firstNode ? (matchIndex - tn.start) : 0));
                            }
                            
                            contentParts.push(text);
                        }
                    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                        // Clone the element structure but we'll replace text
                        const clone = currentNode.cloneNode(false);
                        contentParts.push(clone);
                    }
                    
                    if (currentNode === lastNode.node) break;
                    
                    currentNode = getNextNode(currentNode, container);
                }
                
                // Set the link text content to the full match
                link.textContent = fullMatch;
                
                // Insert the link before the first involved node
                const insertPoint = firstNode.node.parentNode;
                const referenceNode = firstNode.node;
                
                // Handle text before match in first node
                if (firstNode.start < matchIndex) {
                    const beforeText = firstNode.text.substring(0, matchIndex - firstNode.start);
                    insertPoint.insertBefore(document.createTextNode(beforeText), referenceNode);
                }
                
                // Insert the link
                insertPoint.insertBefore(link, referenceNode);
                
                // Handle text after match in last node
                if (lastNode.end > matchEnd) {
                    const afterText = lastNode.text.substring(matchEnd - lastNode.start);
                    insertPoint.insertBefore(document.createTextNode(afterText), referenceNode);
                }
                
                // Remove all involved text nodes and their parent spans if they're now empty
                involvedNodes.forEach(tn => {
                    const parent = tn.node.parentNode;
                    parent.removeChild(tn.node);
                    
                    // If parent is now empty and is a span, remove it too
                    if (parent.tagName === 'SPAN' && parent.childNodes.length === 0 && parent !== container) {
                        parent.parentNode?.removeChild(parent);
                    }
                });
            }
        });
        
        return matches.length > 0;
    }

    /**
     * Get next node in tree traversal
     */
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
                    const cleanPath = path ? path.substring(1) : '';
                    let url = `https://github.com/${org}/${repo}/tree/${branch}`;
                    if (cleanPath) url += `/${cleanPath}`;
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
            // Check if we should skip this element (blocks descent into children)
            if (shouldSkipElement(node)) {
                return;
            }
            
            // Check if this looks like a diff line container
            if (node.classList && (
                node.classList.contains('diff-text-inner') ||
                node.classList.contains('blob-code-inner') ||
                node.classList.contains('pl-s')
            )) {
                processContainer(node);
            } else {
                // Process children normally
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
