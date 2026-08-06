# BoundingBoxApp Agent Rules

## Verification & Testing Practices
To prevent silent failures, caching issues, and broken features, always follow these practices when modifying this project:

1. **Verify with Local Automated Tests First**: 
   - Instead of asking the user to manually test changes in their browser, spin up a headless browser (like `Playwright` via Node.js scripts) to automatically load `http://localhost:8000`. 
   - Simulate the exact user actions and verify the output definitively before presenting the change.

2. **Check for Silent Runtime Errors**: 
   - When an event listener or a new feature isn't working as expected, do not jump to hardware or browser-quirk conclusions.
   - Use your headless browser testing to capture and print the page's console logs (`pageerror` and `console` events) to ensure a runtime exception isn't halting the JavaScript execution entirely.

3. **Verify DOM Element IDs and Selectors**: 
   - Never assume HTML element IDs match your JavaScript references. 
   - Before applying JavaScript logic that depends on the DOM, always perform a `grep_search` or `view_file` on the HTML file to guarantee the element ID actually exists as typed (e.g. `search-input` vs `searchInput`).

4. **Isolate Feature Changes & Validate the Flow**: 
   - When adding new standalone features, ensure they don't silently break unrelated code. 
   - A runtime error anywhere in the file will stop execution for all code below it. Validate that the entire page flow functions correctly after a change.
