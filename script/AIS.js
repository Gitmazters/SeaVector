// Skapar kartan och kopplar den till div-taggen med id="aisMap"
const aisMap = L.map("aisMap").setView([57.6348, 18.2948], 10);

// Lägger till kartlager från OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "© OpenStreetMap"
}).addTo(aisMap);

// Här sparas båtarna så att samma båt uppdateras istället för att ritas ut flera gånger
const vesselMarkers = {};

const boatIcon = L.icon({
  iconUrl: "images/pinkBoat.png",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

// Anslutning till AISstream
const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

socket.addEventListener("open", function () {
  console.log("Ansluten till AISstream");

  const subscriptionMessage = {
    APIKey: "ca6c25fcdf234d9df108f8f2ab4c060e883f2b74",

    // Område runt Gotland/Visby
    BoundingBoxes: [
      [
        [57.0, 17.0],
        [58.5, 19.5]
      ]
    ],

    FilterMessageTypes: ["PositionReport"]
  };

  socket.send(JSON.stringify(subscriptionMessage));
});

socket.binaryType = "blob";
socket.addEventListener("message", async (event) => {
  const text = await event.data.text();
  const aisData = JSON.parse(text);

  console.log(aisData)

  if (!aisData.Message || !aisData.Message.PositionReport) {
    return;
  }

  const positionReport = aisData.Message.PositionReport;
  const mmsi = positionReport.UserID;
  const latitude = positionReport.Latitude;
  const longitude = positionReport.Longitude;
  const speed = positionReport.Sog;
  const course = positionReport.Cog;
  const shipName = aisData.MetaData.ShipName;

  if (latitude === undefined || longitude === undefined) {
    return;
  }

  const popupContent = `
   <strong>Name:</strong> ${shipName}<br>
    <strong>MMSI:</strong> ${mmsi}<br>
    <strong>Speed:</strong> ${speed} knots<br>
    <strong>Course:</strong> ${course}°
  `;

  const safeCourse = Number(course) || 0;

  const courseEndPoint = getCourseEndPoint(latitude, longitude, safeCourse);

  if (vesselMarkers[mmsi]) {
    vesselMarkers[mmsi].marker
      .setLatLng([latitude, longitude])
      .setPopupContent(popupContent);

    vesselMarkers[mmsi].trackPoints.push([latitude, longitude]);

    if (vesselMarkers[mmsi].trackPoints.length > 20) {
      vesselMarkers[mmsi].trackPoints.shift();
    }

    vesselMarkers[mmsi].trackLine.setLatLngs(vesselMarkers[mmsi].trackPoints);
    vesselMarkers[mmsi].courseLine.setLatLngs([
      [latitude, longitude],
      courseEndPoint
    ]);

  } else {
    vesselMarkers[mmsi] = {
      marker: L.marker([latitude, longitude], {
        icon: boatIcon,
      })
        .addTo(aisMap)
        .bindPopup(popupContent),

      trackPoints: [[latitude, longitude]],

      trackLine: L.polyline([[latitude, longitude]], {
        color: "magenta",
        weight: 2,
        opacity: 0.7
      }).addTo(aisMap),

      courseLine: L.polyline([
        [latitude, longitude],
        courseEndPoint
      ], {
        color: "pink",
        weight: 3,
        opacity: 0.9
      }).addTo(aisMap)
    };
  }
});

socket.addEventListener("error", function (error) {
  console.error("Fel vid AIS-anslutning:", error);
});

socket.addEventListener("close", function () {
  console.log("AIS-anslutningen stängdes");
});

//ritar linjen ifrån båtarna
function getCourseEndPoint(lat, lon, courseDegrees) {
  const distanceNm = 1; // 2 nautiska mil
  const distanceDeg = distanceNm / 60;
  const radians = courseDegrees * Math.PI / 180;

  const endLat = lat + distanceDeg * Math.cos(radians);
  const endLon = lon + distanceDeg * Math.sin(radians) / Math.cos(lat * Math.PI / 180);

  return [endLat, endLon];
}