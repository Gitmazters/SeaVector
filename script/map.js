const map = L.map("map").setView([57.6348, 18.2948], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

let points = [];
let markers = [];
let routeLine = null;

const clearBtn = document.getElementById("clearBtn");
const distanceText = document.getElementById("distance");

map.on("click", function (e) {
  const point = e.latlng;
  points.push(point);

  const marker = L.marker(point).addTo(map);
  markers.push(marker);
  drawRoute();
});

clearBtn.addEventListener("click", clearRoute);

function drawRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
  }

  routeLine = L.polyline(points, {
    color: "magenta",
    weight: 4
  }).addTo(map);

  let totalMeters = 0;

  for (let i = 1; i < points.length; i++) {
    totalMeters += map.distance(points[i - 1], points[i]);
  }

  const nauticalMiles = totalMeters / 1852;

  distanceText.textContent = "Distance: " + nauticalMiles.toFixed(2) + " NM";
}

function zoomToPosition() {
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (isNaN(lat) || isNaN(lng)) {
    alert("Ange både latitud och longitud.");
    return;
  }

  map.setView([lat, lng], 14);

  L.marker([lat, lng])
    .addTo(map)
    .bindPopup("Inmatad position")
    .openPopup();
}

function clearRoute() {
  points = [];

  markers.forEach(function (marker) {
    map.removeLayer(marker);
  });

  markers = [];

  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
  distanceText.textContent = "Distans: 0 NM";
}

const printRouteBtn = document.getElementById("printRouteBtn");

printRouteBtn.addEventListener("click", printRoutePlan);

function printRoutePlan() {
  if (points.length === 0) {
    alert("Du har inte placerat ut några ruttpunkter.");
    return;
  }

  let totalMeters = 0;

  for (let i = 1; i < points.length; i++) {
    totalMeters += map.distance(points[i - 1], points[i]);
  }

  const nauticalMiles = totalMeters / 1852;

  let routeHtml = `
    <h1>Ruttplanering</h1>
    <p><strong>Total distans:</strong> ${nauticalMiles.toFixed(2)} NM</p>

    <table>
      <thead>
        <tr>
          <th>Punkt</th>
          <th>Latitud</th>
          <th>Longitud</th>
        </tr>
      </thead>
      <tbody>
  `;

  points.forEach(function (point, index) {
    routeHtml += `
      <tr>
        <td>${index + 1}</td>
        <td>${point.lat.toFixed(6)}</td>
        <td>${point.lng.toFixed(6)}</td>
      </tr>
    `;
  });

  routeHtml += `
      </tbody>
    </table>
  `;

  const printWindow = window.open("", "_blank");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="UTF-8">
      <title>Ruttplanering</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 30px;
        }

        h1 {
          margin-bottom: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        th, td {
          border: 1px solid #333;
          padding: 8px;
          text-align: left;
        }

        th {
          background-color: #eee;
        }
      </style>
    </head>
    <body>
      ${routeHtml}
    </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = function () {
    printWindow.print();
  };
}