const consoleImport = `
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Custom Console</title>
			<link rel="stylesheet" type="text/css" href="assets/console/style.css">
		</head>
		<body>
			<div id="resize-handle"></div>
			<div id="console-container">
				<div id="console-output"></div>
				<input type="text" id="console-input" placeholder="Enter command...">
			</div>
		
			<script src="assets/console/script.js"></script>
            
            <script>
                Object.keys(window).forEach(function(item) {
                    if (typeof window[item] === 'function') {
                        window[item] = window[item];
   					 }
				});
            </script>
		</body>
	</html>
`;

// import into html file using:
//
// <script src="console/console-import.js"></script>
// <script>document.write(consoleImport)</script>
