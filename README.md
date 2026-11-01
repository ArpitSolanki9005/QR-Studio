# QR Studio — Advanced QR Code Generator

A responsive, browser-based QR generator inspired by the supplied reference image.

## Features
- QR types: URL, Text, Email, Phone, SMS, Wi-Fi, vCard, Event, Location and WhatsApp
- Custom foreground/background colors
- Dot, corner and corner-dot styles
- Optional center logo upload
- PNG, SVG, PDF and WebP downloads
- Download all formats
- Dark/light theme
- Responsive desktop and mobile layout
- QR payload and logo are processed in the browser

## Run in VS Code
1. Extract the ZIP.
2. Open the `qr_studio_frontend` folder in VS Code.
3. Install the **Live Server** extension.
4. Right-click `index.html` → **Open with Live Server**.
5. Select a QR type, enter the requested information and click **Generate QR Code**.

Internet is required to load the QR Code Styling and jsPDF CDN libraries. The app does not send QR content to a server.

## Notes
- Wi-Fi QR codes support WPA, WEP and open networks.
- WhatsApp numbers should include the country code, e.g. `919876543210`.
- Location QR codes use latitude and longitude.
- Always scan-test a generated QR before printing or distributing it. Large logos or dense data can reduce scan reliability.
- PDF uses a centered QR image on an A4 page.


## QR library loading fix
The QR Code Styling library is loaded from jsDelivr, with an Unpkg fallback.
If the error message says the library could not load, check internet access and refresh.
