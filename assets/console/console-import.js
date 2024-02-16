const consoleImport = `
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Custom Console</title>
			<link rel="stylesheet" type="text/css" href="style.css">
		</head>
		<body>
			<div id="resize-handle"></div>
			<div id="console-container">
				<div id="console-output"></div>
				<input type="text" id="console-input" placeholder="Enter command...">
			</div>
		
			<script src="script.js"></script>
		</body>
	</html>
`;

// import into html file using:
//
// <script src="console/console-import.js"></script>
// <script>document.write(consoleImport)</script>

// ADD BACK CONSOLE/...