const map = L.map("map").setView([57.6348, 18.2948], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

let points = [];
let markers = [];
let routeLine = null;

const zoomBtn = document.getElementById("zoomBtn");
const clearBtn = document.getElementById("clearBtn");
const distanceText = document.getElementById("distance");

map.on("click", function (e) {
  const point = e.latlng;

  points.push(point);

  const marker = L.marker(point).addTo(map);
  markers.push(marker);

  drawRoute();
});

zoomBtn.addEventListener("click", zoomToPosition);
clearBtn.addEventListener("click", clearRoute);

function drawRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
  }

  routeLine = L.polyline(points, {
    color: "blue",
    weight: 4
  }).addTo(map);

  let totalMeters = 0;

  for (let i = 1; i < points.length; i++) {
    totalMeters += map.distance(points[i - 1], points[i]);
  }

  const nauticalMiles = totalMeters / 1852;

  distanceText.textContent = "Distans: " + nauticalMiles.toFixed(2) + " NM";
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