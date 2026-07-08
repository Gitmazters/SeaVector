// Skapar kartan och kopplar den till div-taggen med id="aisMap"
// Startar kartan i Stockholm
const aisMap = L.map("aisMap").setView([59.3293, 18.0686], 10);

// Lägger till kartlager från OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "© OpenStreetMap"
}).addTo(aisMap);

// Här sparas båtarna så att samma båt uppdateras istället för att ritas ut flera gånger
let vesselMarkers = {};

// Lagergrupp för båtar, spår och kurslinjer
let vesselLayer = L.layerGroup().addTo(aisMap);

const boatIcon = L.icon({
  iconUrl: "images/arrow.png",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

let socket = null;

// Starta AIS när sidan laddas
connectAIS();

// Uppdatera AIS-området när användaren zoomar eller flyttar kartan
aisMap.on("moveend", function () {
  connectAIS();
});

function connectAIS() {
  // Stäng tidigare AIS-anslutning
  if (socket) {
    socket.close();
  }

  const bounds = aisMap.getBounds();
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();

  console.log("Ny AIS-ruta:");
  console.log("Syd:", south);
  console.log("Väst:", west);
  console.log("Nord:", north);
  console.log("Öst:", east);

  socket = new WebSocket("wss://stream.aisstream.io/v0/stream");
  socket.binaryType = "blob";

  socket.addEventListener("open", function () {
    console.log("Ansluten till AISstream");

    const subscriptionMessage = {
      APIKey: "ca6c25fcdf234d9df108f8f2ab4c060e883f2b74",

      // Hämtar AIS-data för området som syns på kartan just nu
      BoundingBoxes: [
        [
          [south, west],
          [north, east]
        ]
      ],

      FilterMessageTypes: ["PositionReport"]
    };

    console.log("Skickar AIS-prenumeration:");
    console.log(subscriptionMessage);

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

  if (!aisData.Message || !aisData.Message.PositionReport) {
    return;
  }

  const positionReport = aisData.Message.PositionReport;
  const mmsi = positionReport.UserID;
  const latitude = positionReport.Latitude;
  const longitude = positionReport.Longitude;
  const speed = positionReport.Sog;
  const course = positionReport.Cog;
  const shipName = aisData.MetaData?.ShipName || "Unknown";

  if (latitude === undefined || longitude === undefined) {
    return;
  }

  const popupContent = `
    <strong>Name:</strong> ${shipName}<br>
    <strong>MMSI:</strong> ${mmsi}<br>
    <strong>Course:</strong> ${course}°<br>
    <strong>Speed:</strong> ${speed} knots
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
    const marker = L.marker([latitude, longitude], {
      icon: boatIcon,
      rotationAngle: safeCourse,
      rotationOrigin: "center center"
    })
      .bindPopup(popupContent)
      .addTo(vesselLayer);

    const trackLine = L.polyline([[latitude, longitude]], {
      color: "#4db8ff",
      weight: 5,
      opacity: 0.45,
      dashArray: "2, 10",
      lineCap: "round"
    }).addTo(vesselLayer);

    const courseLine = L.polyline([
      [latitude, longitude],
      courseEndPoint
    ], {
      color: "blue",
      weight: 3,
      opacity: 0.9
    }).addTo(vesselLayer);

    vesselMarkers[mmsi] = {
      marker: marker,
      trackPoints: [[latitude, longitude]],
      trackLine: trackLine,
      courseLine: courseLine,
    };
  }
}

// Ritar linjen ifrån båtarna
function getCourseEndPoint(lat, lon, courseDegrees) {
  const distanceNm = 1;
  const distanceDeg = distanceNm / 60;
  const radians = courseDegrees * Math.PI / 180;

  const endLat = lat + distanceDeg * Math.cos(radians);
  const endLon =
    lon +
    distanceDeg * Math.sin(radians) / Math.cos(lat * Math.PI / 180);

  return [endLat, endLon];
}



function createArrowIcon(courseDegrees) {
  return L.divIcon({
    className: "course-arrow-icon",
    html: `<div style="
      transform: rotate(${courseDegrees}deg);
      color: blue;
      font-size: 24px;
      line-height: 24px;
    ">▲</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}