function getNumber(id) {
  const value = parseFloat(document.getElementById(id).value);

  if (isNaN(value) || value <= 0) {
    return null;
  }
  return value;
}

function calculateSpeed() {
  const distance = getNumber("distance");
  const time = getNumber("time");

  if (!distance || !time) {
    showResult("Fyll i distans och tid.");
    return;
  }

  const speed = distance / time;
  showResult(`Farten är ${speed.toFixed(2)} knop.`);
}

function calculateDistance() {
  const speed = getNumber("speed");
  const time = getNumber("time");

  if (!speed || !time) {
    showResult("Fyll i fart och tid.");
    return;
  }

  const distance = speed * time;
  showResult(`Distansen är ${distance.toFixed(2)} nautiska mil.`);
}

function calculateTime() {
  const distance = getNumber("distance");
  const speed = getNumber("speed");

  if (!distance || !speed) {
    showResult("Fyll i distans och fart.");
    return;
  }

  const time = distance / speed;
  showResult(`Tiden är ${time.toFixed(2)} timmar.`);
}

function showResult(message) {
  document.getElementById("result").textContent = message;
}

function clearFields() {
  document.getElementById("distance").value = "";
  document.getElementById("time").value = "";
  document.getElementById("speed").value = "";
  document.getElementById("result").textContent = "";
}

function calculateNauticalDistance() {
  const lat1 = getNumber("lat1");
  const lon1 = parseFloat(document.getElementById("lon1").value);
  const lat2 = getNumber("lat2");
  const lon2 = parseFloat(document.getElementById("lon2").value);

  if (!lat1 || isNaN(lon1) || !lat2 || isNaN(lon2)) {
    document.getElementById("mapResult").textContent =
      "Fyll i alla koordinater.";
    return;
  }

  const distanceNm = haversineNauticalMiles(lat1, lon1, lat2, lon2);

  document.getElementById("mapResult").textContent =
    `Avståndet är cirka ${distanceNm.toFixed(2)} nautiska mil.`;
}

function haversineNauticalMiles(lat1, lon1, lat2, lon2) {
  const earthRadiusNm = 3440.065;

  const toRadians = degrees => degrees * Math.PI / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusNm * c;
}

let currentStartTime = null;
let currentEndTime = null;
let currentStartPosition = null;
let currentEndPosition = null;
let currentTimerInterval = null;

function startCurrentMeasurement() {
  navigator.geolocation.getCurrentPosition(
    function (position) {
      currentStartPosition = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      currentStartTime = new Date();
      currentEndTime = null;
      currentEndPosition = null;

      document.getElementById("currentStartPosition").textContent =
        `${currentStartPosition.lat.toFixed(6)}, ${currentStartPosition.lon.toFixed(6)}
  Accuracy: ±${currentStartPosition.accuracy.toFixed(0)} m`;


      document.getElementById("currentEndPosition").textContent = "Not fetched.";
      document.getElementById("currentResult").textContent = "";

      if (currentTimerInterval) {
        clearInterval(currentTimerInterval);
      }

      currentTimerInterval = setInterval(updateCurrentTimer, 1000);
      updateCurrentTimer();
    },
    function () {
      alert("Could not fetch your position.");
    },
    {
      enableHighAccuracy: true
    }
  );
}

function stopCurrentMeasurement() {
  if (!currentStartTime || !currentStartPosition) {
    alert("Start the measurement first.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (position) {
      currentEndPosition = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      currentEndTime = new Date();

      if (currentTimerInterval) {
        clearInterval(currentTimerInterval);
      }

      document.getElementById("currentEndPosition").textContent =
        `${currentEndPosition.lat.toFixed(6)}, ${currentEndPosition.lon.toFixed(6)}
  Accuracy: ±${currentEndPosition.accuracy.toFixed(0)} m`;

      calculateCurrentFromTimer();
    },
    function () {
      alert("Could not fetch your position.");
    },
    {
      enableHighAccuracy: true
    }
  );
}

function resetCurrentMeasurement() {
  currentStartTime = null;
  currentEndTime = null;
  currentStartPosition = null;
  currentEndPosition = null;

  if (currentTimerInterval) {
    clearInterval(currentTimerInterval);
  }

  document.getElementById("currentTimer").textContent = "00:00:00";
  document.getElementById("currentStartPosition").textContent = "Not fetched.";
  document.getElementById("currentEndPosition").textContent = "Not fetched.";
  document.getElementById("currentResult").textContent = "";
}

function updateCurrentTimer() {
  if (!currentStartTime) {
    return;
  }

  const now = new Date();
  const elapsedSeconds = Math.floor((now - currentStartTime) / 1000);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  document.getElementById("currentTimer").textContent =
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;
}

function calculateCurrentFromTimer() {
  const result = document.getElementById("currentResult");

  const timeHours = (currentEndTime - currentStartTime) / 1000 / 60 / 60;

  const distanceNm = calculateCurrentDistanceNm(
    currentStartPosition.lat,
    currentStartPosition.lon,
    currentEndPosition.lat,
    currentEndPosition.lon
  );

  const distanceMeters = distanceNm * 1852;
  const maxError =
    currentStartPosition.accuracy + currentEndPosition.accuracy;

  if (distanceMeters < maxError) {
    result.innerHTML = `
    Distance: ${distanceNm.toFixed(3)} NM<br>
    Distance in meters: ${distanceMeters.toFixed(1)} m<br>
    GPS accuracy: ±${maxError.toFixed(0)} m<br><br>
    Movement is within GPS error margin. Current/drift cannot be calculated reliably.
  `;
    return;
  }

  const currentKnots = distanceNm / timeHours;

  const direction = calculateCurrentDirection(
    currentStartPosition.lat,
    currentStartPosition.lon,
    currentEndPosition.lat,
    currentEndPosition.lon
  );

  result.innerHTML = `
    Distance: ${distanceNm.toFixed(3)} NM<br>
    Time: ${timeHours.toFixed(3)} hours<br>
    Current/drift speed: ${currentKnots.toFixed(2)} knots<br>
    Direction: ${direction.toFixed(0)}°
  `;
}

function calculateCurrentDistanceNm(lat1, lon1, lat2, lon2) {
  const earthRadiusNm = 3440.065;

  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const deltaLat = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
    Math.cos(lat2Rad) *
    Math.sin(deltaLon / 2) *
    Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusNm * c;
}

function calculateCurrentDirection(lat1, lon1, lat2, lon2) {
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLon);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;

  return (bearing + 360) % 360;
}