// Skapar kartan och kopplar den till div-taggen med id="aisMap"
// Startar kartan över Stockholm
const aisMap = L.map("aisMap").setView([59.3293, 18.0686], 10);

// Lägger till kartlager från OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "© OpenStreetMap"
}).addTo(aisMap);

// Här sparas båtarna så att samma båt uppdateras istället för att ritas ut flera gånger
const vesselMarkers = {};

const boatIcon = L.icon({
  iconUrl: "images/pinkBoat.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Här sparas WebSocket-anslutningen
let socket;

// Startar AIS-anslutningen
connectAIS();

// När användaren flyttar eller zoomar kartan hämtas AIS-data för det nya området
aisMap.on("moveend", function () {
  connectAIS();
});

function connectAIS() {
  if (socket) {
    socket.close();
  }

  socket = new WebSocket("wss://stream.aisstream.io/v0/stream");
  socket.binaryType = "blob";

  socket.addEventListener("open", function () {
    console.log("Ansluten till AISstream");

    const bounds = aisMap.getBounds();

    const subscriptionMessage = {
      APIKey: "ca6c25fcdf234d9df108f8f2ab4c060e883f2b74",

      // Området som syns på kartan just nu
      BoundingBoxes: [
        [
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()]
        ]
      ],

      FilterMessageTypes: ["PositionReport"]
    };

    socket.send(JSON.stringify(subscriptionMessage));
  });

  socket.addEventListener("message", handleAISMessage);

  socket.addEventListener("error", function (error) {
    console.error("Fel vid AIS-anslutning:", error);
  });

  socket.addEventListener("close", function () {
    console.log("AIS-anslutningen stängdes");
  });
}

async function handleAISMessage(event) {
  const text = await event.data.text();
  const aisData = JSON.parse(text);

  console.log(aisData);

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
        icon: boatIcon
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
}

// Ritar linjen ifrån båtarna
function getCourseEndPoint(lat, lon, courseDegrees) {
  const distanceNm = 1; // 1 nautisk mil
  const distanceDeg = distanceNm / 60;
  const radians = courseDegrees * Math.PI / 180;

  const endLat = lat + distanceDeg * Math.cos(radians);
  const endLon =
    lon +
    distanceDeg * Math.sin(radians) / Math.cos(lat * Math.PI / 180);

  return [endLat, endLon];
}