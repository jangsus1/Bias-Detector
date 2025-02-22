# React code

- First run "npm install" to download the node packages.
- Then run "npm run" to start the server.
- Frontend server runs on 3000 port while backend should run on 6000 for inpainting.


## Structure
- src/dashboard: component codes for frontend
    - Dashboard.js: main screen component
    - 
    - Images.js: Grid layout for keywords
    - Keywords.js: Table layout for keywords
    - Popover.js: small screen showing image sample and caption
    - 
    - **You may redesign all of the components below.**
    - Rule.js: panel where people can drag-n-drop keywords to form multiple bias concepts
    - Solver.js: panel where the number of images to generate is calculated
    - 
    - Inpainter.js: inpainter screen
    - InpaintBlock.js: inpainter section's row
    - Draw.js: panel where participant can draw the mask for inpainter

